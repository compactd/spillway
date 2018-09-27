"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const debug = Debug('server');
exports.log = debug;
exports.warn = debug.extend('warn');
exports.err = debug.extend('err');
exports.trace = debug.extend('trace');
