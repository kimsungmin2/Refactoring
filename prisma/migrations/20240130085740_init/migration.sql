-- AlterTable
ALTER TABLE `Users` MODIFY `permission` ENUM('User', 'Admin') NOT NULL DEFAULT 'User';
DELETE FROM Users WHERE userId = 13;