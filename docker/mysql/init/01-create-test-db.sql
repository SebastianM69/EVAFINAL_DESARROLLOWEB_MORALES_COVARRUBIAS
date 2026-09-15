CREATE DATABASE IF NOT EXISTS ventasfix_test;
CREATE DATABASE IF NOT EXISTS ventasfix_shadow;
GRANT ALL PRIVILEGES ON ventasfix_test.* TO 'ventasfix'@'%';
GRANT ALL PRIVILEGES ON ventasfix_shadow.* TO 'ventasfix'@'%';
FLUSH PRIVILEGES;
