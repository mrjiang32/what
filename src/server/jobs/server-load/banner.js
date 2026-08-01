import chalk from "chalk";

const logo = `I8,        8        ,8I  88                                 ad88888ba   
\`8b       d8b       d8'  88                         ,d     d8"     "8b  
 "8,     ,8"8,     ,8"   88                         88     ""      a8P  
  Y8     8P Y8     8P    88,dPPYba,   ,adPPYYba,  MM88MMM       ,a8P"   
  \`8b   d8' \`8b   d8'    88P'    "8a  ""     \`Y8    88         d8"      
   \`8a a8'   \`8a a8'     88       88  ,adPPPPP88    88         ""       
    \`8a8'     \`8a8'      88       88  88,    ,88    88,        aa       
     \`8'       \`8'       88       88  \`"8bbdP"Y8    "Y888      88       `;

export default {
  banner: {
    type: "init",
    priority: 110,
    allowContext: false,
    job: async () => {
      console.log(chalk.green(logo));
    },
  },
};
