-- InsuranceCard - SQL Server: tạo database (chạy trước khi khởi động backend với DB_VENDOR=sqlserver)
IF DB_ID(N'InsuranceCard') IS NULL CREATE DATABASE InsuranceCard;
GO
