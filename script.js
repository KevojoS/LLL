// let difficultyLevel = 0; 
// let mode = "minimalist";


// const difficultyLevelField = document.getElementById("difficultyInput");
// const modeField = document.getElementById("modeInput")

// difficultyLevelField.addEventListener("input", (event) => {
//   difficultyLevel = parseInt(event.target.value);
//   console.log("Updated level:", difficultyLevel);
// });

// modeField.addEventListener("input", (event) => {
//   mode = event.target.value;
//   console.log("Updated mode:", mode);
// });

const webScrape = (dom) => {
    const elements = dom.querySelectorAll(`
    h1,h2,h3,h4,h5,h6,
    p,span,article,section,main,header,aside,nav,
    li,dt,dd,dl,
    a,button,label,
    td,th,caption,
    em,strong,i,b,small,mark
  `)
    elementsArray = Array.from(elements)
        .filter(element => element.textContent.length > 0)
        .filter(element => !element.classList.contains('hidden'))
    
    sentencesArray = Array.from(elementsArray).map(
        element => element.textContent.match(/[^.!?]+[.!?]+/g) || []
    )
    console.log(sentencesArray);


    
}

webScrape(document);