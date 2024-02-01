/*
  Warnings:

  - Added the required column `permission` to the `Users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Users` ADD COLUMN `permission` ENUM('User', 'Admin') NOT NULL;
