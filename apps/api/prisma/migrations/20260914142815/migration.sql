-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rut` VARCHAR(12) NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `apellido` VARCHAR(100) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_rut_key`(`rut`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcionCorta` VARCHAR(255) NOT NULL,
    `descripcionLarga` TEXT NOT NULL,
    `imagePath` VARCHAR(255) NOT NULL,
    `precioNeto` DECIMAL(12, 2) NOT NULL,
    `precioVenta` DECIMAL(12, 2) NOT NULL,
    `stockActual` INTEGER NOT NULL,
    `stockMinimo` INTEGER NOT NULL,
    `stockBajo` INTEGER NOT NULL,
    `stockAlto` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Product_sku_key`(`sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Client` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rutEmpresa` VARCHAR(12) NOT NULL,
    `rubro` VARCHAR(150) NOT NULL,
    `razonSocial` VARCHAR(200) NOT NULL,
    `telefono` VARCHAR(20) NOT NULL,
    `direccion` VARCHAR(255) NOT NULL,
    `nombreContacto` VARCHAR(150) NOT NULL,
    `emailContacto` VARCHAR(254) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Client_rutEmpresa_key`(`rutEmpresa`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthSession` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `refreshTokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthSession_refreshTokenHash_key`(`refreshTokenHash`),
    INDEX `AuthSession_userId_idx`(`userId`),
    INDEX `AuthSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthSession` ADD CONSTRAINT `AuthSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
