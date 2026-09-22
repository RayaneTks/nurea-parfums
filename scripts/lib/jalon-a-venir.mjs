// Script npm déclaré avant son jalon (docs/refonte/07-PLAN-EXECUTION.md, J0).
const [, , script, jalon] = process.argv;
console.error(`« ${script} » n'existe pas encore : livré au jalon ${jalon} (docs/refonte/07-PLAN-EXECUTION.md).`);
process.exit(1);
