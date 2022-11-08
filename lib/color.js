const chalk = require('chalk');

module.exports.color = (text, color) => {
return !color ? chalk.green(text) : chalk.keyword(color)(text);
}

module.exports.bgColor = (text, color) => {
return !color ? chalk.bgGreen(text) : chalk.bgKeyword(color)(text);
}