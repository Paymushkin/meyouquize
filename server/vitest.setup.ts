/** Тесты auth/socket должны проверять реальную авторизацию, не LAN-bypass. */
process.env.APP_NETWORK_MODE = "internet";
process.env.LOCAL_ADMIN_NO_AUTH = "0";
