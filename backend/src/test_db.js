import dotenv from 'dotenv';
dotenv.config({path: '../.env'});
import { getDashboardStats } from './api/finance_panel/controller.js';
const req = { query: {} };
const res = {
  status: function(s) { return this; },
  json: function(data) { console.log("JSON RES:", data); }
};
getDashboardStats(req, res).catch(console.error);
