require 'sinatra'
require 'sinatra/json'
require 'sinatra/reloader' if development?
require 'dotenv/load'
require 'tapsilat'
require 'json'
require 'fileutils'
require 'securerandom'

# Configure Tapsilat
Tapsilat.configure do |config|
  config.base_url = ENV['TAPSILAT_BASE_URL'] || 'https://panel.tapsilat.dev/api/v1'
  config.api_token = ENV['TAPSILAT_API_KEY']
end

# Debug: Verify configuration
puts "Tapsilat Configuration:"
puts "  Base URL: #{Tapsilat.base_url}"
puts "  API Token: #{Tapsilat.api_token ? '[SET]' : '[NOT SET]'}"
puts "  Configured?: #{Tapsilat.configured?}"

# Helpers
helpers do
  def tapsilat_client
    @tapsilat_client ||= Tapsilat::Client.new
  end

  def generate_conversation_id
    timestamp = Time.now.to_i
    unique_id = SecureRandom.hex(4)
    "CONV_#{timestamp}_#{unique_id}"
  end

  def generate_reference_id(prefix)
    "#{prefix}_#{SecureRandom.hex(4)}"
  end

  def calculate_total(cart)
    cart.sum { |item| item['price'].to_f * [item['quantity'].to_i, 1].max }
  end

  def save_webhook(type, body)
    FileUtils.mkdir_p('webhooks')
    timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
    rand_suffix = rand(1000)
    filename = "webhooks/#{timestamp}_#{rand_suffix}_#{type}.json"
    
    File.write(filename, body)
    puts "Webhook saved: #{filename}"
  end
end

# Routes

# Home page
get '/' do
  erb :index
end

# Create Order
post '/api/order' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    
    total = calculate_total(data['cart'])
    conversation_id = data['conversation_id'].to_s.empty? ? generate_conversation_id : data['conversation_id']
    
    # Build basket items
    basket_items = data['cart'].map do |item|
      total_price = item['price'].to_f * [item['quantity'].to_i, 1].max
      {
        id: item['id'].to_s,
        name: item['name'],
        price: total_price,
        quantity: 1, # API requires 1 if price is total
        category1: 'Electronics',
        item_type: 'PHYSICAL'
      }
    end
    
    billing = data['billing']
    shipping = (!data['same_address'] && data['shipping']) ? data['shipping'] : billing
    
    # Build metadata
    metadata = [
      { key: 'cart_items_count', value: data['cart'].length.to_s },
      { key: 'selected_installment', value: data['installment'].to_s },
      { key: 'same_billing_shipping', value: data['same_address'].to_s },
      { key: 'application_name', value: 'Tapsilat Ruby SDK Example' },
      { key: 'framework', value: 'Sinatra' },
      { key: 'customer_city', value: billing['city'] }
    ]
    metadata += data['metadata'] if data['metadata']
    
    # Build order data
    order_data = tapsilat_client.orders.build_order(
      locale: data['locale'].to_s.empty? ? 'en' : data['locale'],
      amount: total,
      currency: data['currency'].to_s.empty? ? 'TRY' : data['currency'],
      conversation_id: conversation_id,
      buyer: {
        name: billing['contact_name'].split.first || 'Customer',
        surname: billing['contact_name'].split.last || 'User',
        email: billing['email'],
        gsm_number: billing['contact_phone'],
        identity_number: billing['vat_number'],
        registration_address: billing['address'],
        city: billing['city'],
        country: 'Turkey',
        zip_code: billing['zip_code'],
        ip: '127.0.0.1'
      },
      billing_address: {
        contact_name: billing['contact_name'],
        city: billing['city'],
        country: 'Turkey',
        address: billing['address'],
        zip_code: billing['zip_code'],
        vat_number: billing['vat_number']
      },
      shipping_address: {
        contact_name: shipping['contact_name'],
        city: shipping['city'],
        country: 'Turkey',
        address: shipping['address'],
        zip_code: shipping['zip_code']
      },
      basket_items: basket_items,
      metadata: metadata,
      payment_success_url: "#{request.base_url}/payment/success",
      payment_failure_url: "#{request.base_url}/payment/failure",
      three_d_force: data['three_d_force'] || false,
      payment_methods: data['payment_methods'] || true,
      payment_options: data['payment_options'].to_a.empty? ? ['card', 'bank_transfer'] : data['payment_options'],
      enabled_installments: data['enabled_installments'].to_a.empty? ? nil : data['enabled_installments']
    )
    
    response = tapsilat_client.orders.create(order_data)
    
    json({
      success: true,
      checkout_url: response.checkout_url,
      reference_id: response.reference_id,
      error: nil
    })
  rescue => e
    puts "Error creating order: #{e.message}"
    puts e.backtrace
    json({
      success: false,
      checkout_url: nil,
      reference_id: nil,
      error: "Failed to create order: #{e.message}"
    })
  end
end

# Create Subscription
post '/api/subscription' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    
    subscription = tapsilat_client.subscriptions.create(
      title: data['name'],
      amount: data['amount'].to_f,
      currency: 'TRY',
      period: data['period'].to_i,
      payment_date: [data['payment_date'].to_i, 1].max,
      cycle: 12,
      success_url: "#{request.base_url}/payment/success",
      failure_url: "#{request.base_url}/payment/failure",
      user: {
        id: generate_reference_id('SUB_USER'),
        first_name: 'John',
        last_name: 'Doe',
        email: data['subscriber_email'],
        phone: data['subscriber_phone'],
        address: 'Mock Address',
        city: 'Istanbul',
        country: 'Turkey',
        zip_code: '34000',
        identity_number: '11111111111'
      },
      billing: {
        contact_name: 'John Doe',
        country: 'Turkey',
        city: 'Istanbul',
        address: 'Mock Billing Address',
        zip_code: '34000',
        vat_number: '11111111111'
      }
    )
    
    checkout_url = nil
    if subscription['order_reference_id']
      begin
        order = tapsilat_client.orders.get(subscription['order_reference_id'])
        checkout_url = order.checkout_url
      rescue => e
        puts "Could not fetch checkout URL: #{e.message}"
      end
    end
    
    json({
      success: true,
      reference_id: subscription['reference_id'],
      checkout_url: checkout_url,
      error: nil
    })
  rescue => e
    puts "Error creating subscription: #{e.message}"
    json({
      success: false,
      checkout_url: nil,
      reference_id: nil,
      error: "Failed to create subscription: #{e.message}"
    })
  end
end

# Payment Success
get '/payment/success' do
  @reference_id = params[:reference_id]
  @conversation_id = params[:conversation_id]
  erb :payment_success
end

# Payment Failure
get '/payment/failure' do
  @reference_id = params[:reference_id]
  @conversation_id = params[:conversation_id]
  @error_message = params[:error_message]
  erb :payment_failure
end

# Order Management APIs
get '/api/order/list' do
  content_type :json
  
  begin
    page = params[:page]&.to_i || 1
    per_page = params[:per_page]&.to_i || 10
    
    result = tapsilat_client.orders.list(
      page: page,
      per_page: per_page,
      start_date: params[:start_date],
      end_date: params[:end_date],
      organization_id: params[:organization_id],
      related_reference_id: params[:related_reference_id]
    )
    
    json(result.to_h)
  rescue => e
    json({ error: e.message })
  end
end

get '/api/order/details/:reference_id' do
  content_type :json
  
  begin
    order = tapsilat_client.orders.get(params[:reference_id])
    json(order.to_h)
  rescue => e
    json({ error: e.message })
  end
end

get '/api/order/transactions/:reference_id' do
  content_type :json
  
  begin
    result = tapsilat_client.orders.get_transactions(params[:reference_id])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

get '/api/order/conversation/:conversation_id' do
  content_type :json
  
  begin
    order = tapsilat_client.orders.get_by_conversation_id(params[:conversation_id])
    json(order.to_h)
  rescue => e
    json({ error: e.message })
  end
end

get '/api/order/submerchants' do
  content_type :json
  
  begin
    page = params[:page]&.to_i || 1
    per_page = params[:per_page]&.to_i || 10
    result = tapsilat_client.orders.submerchants(page: page, per_page: per_page)
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

get '/api/payment/status/:reference_id' do
  content_type :json
  
  begin
    status = tapsilat_client.orders.get_status(params[:reference_id])
    json(status.to_h)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/cancel' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.cancel(data['reference_id'])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/refund' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.refund(
      data['reference_id'],
      data['amount'],
      order_item_id: data['order_item_id'],
      order_item_payment_id: data['order_item_payment_id']
    )
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

# Subscription APIs
get '/api/subscription/list' do
  content_type :json
  
  begin
    result = tapsilat_client.subscriptions.list(page: 1, per_page: 20)
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/subscription/cancel' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.subscriptions.cancel(reference_id: data['subscription_id'])
    json({ success: true, message: 'Subscription cancelled' })
  rescue => e
    json({ error: e.message })
  end
end

# Payment Terms APIs
get '/api/term/:reference_id' do
  content_type :json
  
  begin
    result = tapsilat_client.orders.get_term(params[:reference_id])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/term/create' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.create_term(data)
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/term/delete' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.delete_term(data['order_id'], data['term_reference_id'])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/term/update' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.update_term(data)
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/term/refund' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.refund_term(data)
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

# Order Management Extra Actions
post '/api/order/terminate' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.terminate(data['reference_id'])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

post '/api/order/manual-callback' do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read)
    result = tapsilat_client.orders.manual_callback(data['reference_id'], conversation_id: data['conversation_id'])
    json(result)
  rescue => e
    json({ error: e.message })
  end
end

# Webhook handlers
post '/api/callback' do
  save_webhook('success', request.body.read)
  json({ status: 'received' })
end

post '/api/fail_callback' do
  save_webhook('fail', request.body.read)
  json({ status: 'received' })
end

post '/api/refund_callback' do
  save_webhook('refund', request.body.read)
  json({ status: 'received' })
end

post '/api/cancel_callback' do
  save_webhook('cancel', request.body.read)
  json({ status: 'received' })
end

get '/api/webhooks' do
  content_type :json
  
  begin
    FileUtils.mkdir_p('webhooks')
    files = Dir.glob('webhooks/*.json').sort.reverse
    
    logs = files.map do |file|
      content = File.read(file)
      {
        filename: File.basename(file),
        content: JSON.parse(content),
        raw: content
      }
    rescue JSON::ParserError
      {
        filename: File.basename(file),
        content: nil,
        raw: content
      }
    end
    
    json(logs)
  rescue => e
    json({ error: e.message })
  end
end


# Organization APIs
get '/api/organization/settings' do
  content_type :json

  begin
    settings = tapsilat_client.organization.settings
    json(settings)
  rescue => e
    json({ error: e.message })
  end
end

# Start server
set :port, ENV['PORT'] || 8080
set :bind, '0.0.0.0'
