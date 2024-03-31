import { program } from "commander";

program.name("autoformfill").description("CLI to send automated responses to Google Forms.").version("1.0.0");

program.option("-w, --weights <path>", 'path to the weights for selecting random options [JSON]');


const options = program.opts();
program.parse();
console.log(options);