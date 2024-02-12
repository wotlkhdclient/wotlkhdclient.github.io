/**
 * DBC utility implementation in JavaScript.
 * @author: Trimitor
 * @license: MIT
 * @version: 1.0
 * Wiki: https://wowdev.wiki/DBC
 */

'use strict';

const MAGIC_NUMBER = 1128416343; // WDBC
const typeSyzes = { // in bytes
    'long': 4,
    'str': 4,
    'float': 4,
    'flags': 4,
    'bool' : 1,
}

var debug = false;

class DBC
{
    constructor(data, schema)
    {
        if (!data || !data.length) throw new Error("Data is required");
        if (!schema || !schema.length) throw new Error("Schema is required");
        
        this.data = data;
        this.schema = schema;
    }
    async loadSchema() {
        return await fetch(this.schema).then(response => response.json());
    }
    getRecordSize(schema) {
        return schema.fields.reduce((acc, field) => {
            if (!field.type) throw new Error('Unknown field type: ' + field.type);
            return acc + typeSyzes[field.type];
        }, 0);
    }
    async read(options = {type : 'csv', delimiter : ',', lineBreak : '\r\n'})
    {
        var schema = await this.loadSchema(); // load schema first
        var offset = 0; // offset in bytes
        
        // header data template
        this.magic = 0;
        this.record_count = 0;
        this.field_count = 0;
        this.record_size = 0;
        this.string_block_size = 0;

        return loadFrom(this.data).then(buffer => {
            var reader = new DataView(buffer); // create reader

            this.magic = reader.getUint32(offset, true);
            if (this.magic !== MAGIC_NUMBER) throw new Error('Invalid magic number: ' + this.magic);
            offset += 4;
            this.record_count = reader.getUint32(offset, true);
            offset += 4;
            this.field_count = reader.getUint32(offset, true);
            offset += 4;
            this.record_size = reader.getUint32(offset, true);
            offset += 4;
            this.string_block_size = reader.getUint32(offset, true);
            offset += 4;

            this.rows = []; // rows

            for (var i = 0; i < this.record_count; i++) {
                var row = {};
                for (var j = 0; j < this.field_count; j++) {
                    var field = schema.fields[j];
                    row[field.name] = ''; // value for string fields
                    switch (field.type) {
                        case 'long':
                            row[field.name] = reader.getInt32(offset, true);
                            offset += 4;
                            break;
                        case 'float':
                            row[field.name] = reader.getFloat32(offset, true); 
                            offset += 4;
                            break;
                        case 'flags':
                            row[field.name] = '0x' + Number(reader.getUint32(offset, true)).toString(16); // convert to hex
                            offset += 4;
                            break;
                        case 'str':
                            var string_offset = reader.getUint32(offset, true);
                            for (var k = buffer.byteLength - this.string_block_size + string_offset; k < buffer.byteLength; k++) {
                                var character = reader.getUint8(k, true);
                                if (character === 0) break;
                                row[field.name] += String.fromCharCode(character);
                            }
                            offset += 4;
                            break;
                        case 'bool':
                            row[field.name] = reader.getUint8(offset, true);
                            offset += 1;
                            break;
                        default:
                            throw new Error('Unknown field type: ' + field.type);
                    }
                }
                this.rows.push(row);
            }

            switch (options.type) {
                case 'csv':
                    const header = Object.keys(this.rows[0]);
                    const rows = this.rows.map(row => header.map(fieldName => row[fieldName]).join(options.delimiter));
                    return [header.join(options.delimiter), ...rows].join(options.lineBreak);
                case 'json':
                    return JSON.stringify(this.rows);
                case 'array':
                    return this.rows;
                default:
                    throw new Error('Unknown type: ' + options.type);
            }
        })
    }

    async write(options = {delimiter : ',', lineBreak : '\r\n', header : true})
    {
        var schema = await this.loadSchema(); // load schema first
        var offset = 0; // offset in buffer

        // header data template
        this.magic = 0;
        this.record_count = 0;
        this.field_count = 0;
        this.record_size = 0;
        this.string_block_size = 0; // empty string block size

        this.string_block = new Map();

        return createFrom(this.data, options).then(array => {
            var string_block_offset = 0;
            this.rows = array;

            this.magic = MAGIC_NUMBER;
            this.record_count = this.rows.length;
            this.field_count = schema.fields.length;
            this.record_size = this.getRecordSize(schema);

            this.string_block.set('', string_block_offset);
            string_block_offset += 1;

            for (var row of this.rows) {
                for (var field of schema.fields) {
                    if (field.type === 'str' && !this.string_block.has(row[field.name])) {
                        this.string_block.set(row[field.name], string_block_offset);
                        string_block_offset += row[field.name].length + 1;
                    }
                }
            }

            this.string_block_size = string_block_offset;

            var buffer = new ArrayBuffer(20 + this.record_count * this.record_size + this.string_block_size); // create buffer
            var writer = new DataView(buffer); // create writer
            
            // write header data
            writer.setUint32(offset, this.magic, true);
            offset += 4;
            writer.setUint32(offset, this.record_count, true);
            offset += 4;
            writer.setUint32(offset, this.field_count, true);
            offset += 4;
            writer.setUint32(offset, this.record_size, true);
            offset += 4;
            writer.setUint32(offset, this.string_block_size, true);
            offset += 4;

            for (var row of this.rows) {
                for (var field of schema.fields) {
                    switch (field.type) {
                        case 'long':
                            writer.setInt32(offset, row[field.name], true);
                            offset += 4;
                            break;
                        case 'float':
                            writer.setFloat32(offset, row[field.name], true);
                            offset += 4;
                            break;
                        case 'flags':
                            writer.setUint32(offset, parseInt(row[field.name], 16), true);
                            offset += 4;
                            break;
                        case 'str':
                            writer.setUint32(offset, this.string_block.get(row[field.name]), true);
                            offset += 4;
                            break;
                        case 'bool':
                            writer.setUint8(offset, row[field.name], true);
                            offset += 1;
                            break;
                        default:
                            throw new Error('Unknown field type: ' + field.type);
                    }
                }
            }


            for (var str of this.string_block.keys()) {
                for (var i = 0; i < str.length; i++) {
                    writer.setUint8(offset, str.charCodeAt(i));
                    offset += 1;
                }
                writer.setUint8(offset, 0);
                offset += 1;
            }

            return new Blob([writer.buffer], {type : 'application/octet-stream'});
        })
    }
}

async function loadFrom(file)
{
    if (typeof file === 'string') {
        return await fetch(file).then(response => response.arrayBuffer());
    } else {
        return await new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }
}
async function createFrom(file, options)
{
    if (typeof file === 'object') {
        return file;
    }
    if (typeof file === 'string') {
        var text = await fetch(file).then(response => response.text());
    }
    if (file instanceof Blob) {
        var text = await new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onerror = error => reject(error);
            reader.readAsText(file);
        });
    }

    var lines = text.split(options.lineBreak);
    if (options.header) var header = lines.shift().split(options.delimiter);

    var rows = lines.map(line => {
        var fields = line.split(options.delimiter);
        var obj = {};
        for (var i = 0; i < fields.length; i++) {
            obj[header[i]] = fields[i];
        }
        return obj;
    });

    return rows;
}