let difficultyLevel = 0;
let mode = "minimalist";


const difficultyLevelField = document.getElementById("difficultyInput");
const modeField = document.getElementById("modeInput")

difficultyLevelField.addEventListener("input", (event) => {
  difficultyLevel = parseInt(event.target.value);
  console.log("Updated level:", difficultyLevel);
});

modeField.addEventListener("input", (event) => {
  mode = event.target.value;
  console.log("Updated mode:", mode);
});
