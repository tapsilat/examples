FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["examples/net/Tapsilat.Example.Net.csproj", "examples/net/"]
COPY ["sdks/Tapsilat-Net/src/Tapsilat.Net/Tapsilat.Net.csproj", "sdks/Tapsilat-Net/src/Tapsilat.Net/"]
RUN dotnet restore "examples/net/Tapsilat.Example.Net.csproj"
COPY . .
WORKDIR "/src/examples/net"
RUN dotnet build "Tapsilat.Example.Net.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Tapsilat.Example.Net.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Tapsilat.Example.Net.dll"]
