const path = require('path');

module.exports = {
    entry: './js/invoice.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    target: 'node',
    node: {
        __dirname: false
    }
};