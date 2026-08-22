import 'dotenv/config';
import { migrate } from '../config/db.js';

migrate();
console.log('Schema is up to date.');
