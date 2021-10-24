const arr = [
  { name: "leandro" },
  { name: "pedro" },
  { name: "rafael" },
  { name: "pedro" },
  { name: "karol" },
  { name: "cintia" },
  { name: "iara" },
  { name: "paulo" },
];
const c = arr.length;

while (arr.length > 0) {
  const part = arr.splice(0, 2);

  const teste = part.map((item) => {
    const c = item;
    c;
  });
  part;
}
