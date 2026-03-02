import { runVisible } from '../lib/shell.mjs';

export default {
  name: 'remote-access',
  order: 2,
  description: 'Truy cập từ xa (SSH, tunnel, sudo, keychain)',
  dependencies: [],

  async detect() {
    return { installed: false, details: 'Chạy npx dmdfami/mac để kiểm tra' };
  },

  async install() {
    console.log('\n    Đang chạy dmdfami/mac...\n');
    runVisible('npx -y dmdfami/mac');
  },

  async verify() {
    return true;
  },
};
