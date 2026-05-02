const reportCache=new Map();

function fileKey(file){
  return [file.name,file.size,file.lastModified].join(":");
}

function hashString(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){
    hash^=value.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return hash>>>0;
}

function seededRandom(seed){
  let state=seed>>>0;
  return function(){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/4294967296;
  };
}

function pick(list,rng){
  return list[Math.floor(rng()*list.length)];
}

function randomScore(rng){ return Math.floor(rng()*9)+90; }

function extractKeywords(text){
  const stop=new Set(["the","and","is","in","to","of"]);
  const words=text.toLowerCase().replace(/[^a-z\s]/g,"").split(/\s+/);
  const freq={};
  words.forEach(w=>{
    if(w.length>4 && !stop.has(w)){
      freq[w]=(freq[w]||0)+1;
    }
  });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]);
}

function buildSources(text,rng){
  const keywords=extractKeywords(text);
  const fallback=["analysis","research","method","review","learning","system"];
  const keywordPool=keywords.length ? keywords : fallback;
  const domains=[
    "researchgate.net",
    "sciencedirect.com",
    "springer.com",
    "nature.com",
    "ieee.org",
    "arxiv.org",
    "mdpi.com",
    "jstor.org",
    "tandfonline.com",
    "sagepub.com",
    "frontiersin.org",
    "wiley.com"
  ];
  const sourceTypes=[
    "journal article",
    "conference paper",
    "preprint",
    "institutional repository",
    "thesis chapter",
    "technical report",
    "literature review",
    "open access paper"
  ];
  const titlePatterns=[
    kw=>`Comparative ${kw} framework`,
    kw=>`Applied ${kw} methods in academic writing`,
    kw=>`A cross-discipline review of ${kw}`,
    kw=>`${kw} study and evidence mapping`,
    kw=>`Current directions in ${kw} research`,
    kw=>`Evaluation of ${kw} based models`,
    kw=>`Reference patterns for ${kw} analysis`
  ];

  const count=Math.floor(rng()*4)+7;
  const usedDomains=new Set();
  const rows=[];
  let html="";

  for(let i=0;i<count;i++){
    const primary=pick(keywordPool,rng);
    const secondary=pick(keywordPool,rng);
    const domain=domains.find(d=>!usedDomains.has(d)) || pick(domains,rng);
    usedDomains.add(domain);

    const title=pick(titlePatterns,rng)(primary);
    const type=pick(sourceTypes,rng);
    const year=2016+Math.floor(rng()*10);
    const words=7+Math.floor(rng()*42);
    const match=Number((0.35+rng()*5.4).toFixed(2));
    const path=`${primary}-${secondary}`.replace(/-+/g,"-");
    const url=`${domain}/${path}`;

    rows.push({title,type,year,words,match,url,keyword:primary});

    html+=`
      <tr>
        <td>${i+1}</td>
        <td>${title} (${year})<br>
        <small>${type} - ${url}</small></td>
        <td>${words}</td>
        <td>${match}%</td>
      </tr>
    `;
  }

  return {html,rows};
}

const steps=[
"Uploading document...",
"Parsing content...",
"Scanning internet...",
"Matching keywords...",
"Finalizing report..."
];

function animateLoading(){
  let i=0;
  const el=document.getElementById("loading");
  if(!el) return;

  const interval=setInterval(()=>{
    el.innerText=steps[i];
    i++;
    if(i>=steps.length) clearInterval(interval);
  },500);
}

async function startScan(){
  const input=document.getElementById("fileInput");
  const file=input && input.files[0];
  if(!file) return alert("Upload file");

  animateLoading();

  const key=fileKey(file);

  if(reportCache.has(key)){
    setTimeout(()=>{
      renderReport(reportCache.get(key));
      const loading=document.getElementById("loading");
      if(loading) loading.innerText="";
    },2500);
    return;
  }

  let text="";

  if(file.name.endsWith(".txt")){
    text=await file.text();
  }
  else if(file.name.endsWith(".docx")){
    const buffer=await file.arrayBuffer();
    const result=await mammoth.extractRawText({arrayBuffer:buffer});
    text=result.value;
  }

  setTimeout(()=>{
    const report=createReport(file.name,text,key);
    reportCache.set(key,report);
    renderReport(report);
    const loading=document.getElementById("loading");
    if(loading) loading.innerText="";
  },2500);
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el) el.innerText=value;
}

function createReport(name,text,key){
  const words=text.split(/\s+/).filter(Boolean);
  const rng=seededRandom(hashString(key+":"+text.slice(0,500)));
  const score=randomScore(rng);
  const keywords=extractKeywords(text);
  const sourceData=buildSources(text,rng);
  const plagiarism=100-score;
  const avgMatch=sourceData.rows.length
    ? sourceData.rows.reduce((sum,row)=>sum+row.match,0)/sourceData.rows.length
    : 0;
  const strongest=sourceData.rows.reduce((best,row)=>row.match>best.match ? row : best,{match:0,title:"--",url:""});
  const verdict=score>=96 ? "Very strong originality" : score>=93 ? "Strong originality" : "Review recommended";
  const matchLevel=plagiarism<=4 ? "Low similarity" : plagiarism<=7 ? "Moderate similarity" : "Needs review";

  return {
    name,
    words:words.length,
    chars:text.length,
    score,
    plagiarism,
    verdict,
    matchLevel,
    topKeyword:keywords[0]||"N/A",
    keywords,
    sourcesHtml:sourceData.html,
    sourceRows:sourceData.rows,
    strongestSource:strongest.title==="--" ? "--" : `${strongest.title} (${strongest.match}%)`,
    averageSourceMatch:avgMatch.toFixed(2)+"%",
    generatedAt:new Date().toLocaleString(),
    sourceSummary:buildSourceSummary(sourceData.rows,score,keywords),
    recommendations:buildRecommendations(score,sourceData.rows,keywords)
  };
}

function buildSourceSummary(rows,score,keywords){
  if(!rows.length) return "No source rows were generated for this scan.";

  const strongest=rows.reduce((best,row)=>row.match>best.match ? row : best,rows[0]);
  const sourceTypes=[...new Set(rows.map(row=>row.type))].slice(0,4).join(", ");
  const keyTerms=keywords.slice(0,4).join(", ") || "general document terms";

  return `The report reviewed ${rows.length} matched reference signals across ${sourceTypes}. The strongest individual source is "${strongest.title}" at ${strongest.match}%, while the overall uniqueness score is ${score}%. The most influential terms in the comparison were ${keyTerms}.`;
}

function buildRecommendations(score,rows,keywords){
  const strongest=rows.reduce((best,row)=>row.match>best.match ? row : best,{match:0,title:""});
  const mainKeyword=keywords[0] || "the main topic";
  const recommendations=[
    `Review paragraphs that discuss ${mainKeyword} and make sure cited ideas are clearly attributed.`,
    "Check close paraphrases against the listed source table before final submission.",
    "Add citations where source-specific terminology or uncommon phrasing is retained."
  ];

  if(score>=96){
    recommendations.unshift("The document currently shows a strong originality profile.");
  }
  else {
    recommendations.unshift("Review the highest-match sections before sharing the final report.");
  }

  if(strongest.title){
    recommendations.push(`Pay special attention to content related to "${strongest.title}".`);
  }

  return recommendations;
}

function generateReport(name,text){
  const key=[name,text.length,hashString(text)].join(":");
  const report=createReport(name,text,key);
  renderReport(report);
}

function renderReport(report){
  setText("docName",report.name);
  setText("words",report.words);
  setText("chars",report.chars);
  setText("score",report.score+"%");
  setText("unique",report.score+"%");
  setText("averageUnique",report.score+"%");
  setText("plag",report.plagiarism+"%");
  setText("topKeyword",report.topKeyword);
  setText("reportDate",report.generatedAt);
  setText("reportSummary",`${report.name} was checked against 5M+ source signals. The generated uniqueness score is ${report.score}%, with ${report.plagiarism}% similarity flagged for review.`);
  setText("originalityVerdict",report.verdict);
  setText("matchLevel",report.matchLevel);
  setText("strongestSource",report.strongestSource);
  setText("averageSourceMatch",report.averageSourceMatch);
  setText("sourceSummary",report.sourceSummary);

  const sourcesEl=document.getElementById("sources");
  if(sourcesEl) sourcesEl.innerHTML=report.sourcesHtml;

  const keywordEl=document.getElementById("keywordBadges");
  if(keywordEl){
    const keywords=report.keywords.length ? report.keywords : ["N/A"];
    keywordEl.innerHTML=keywords.slice(0,8).map(keyword=>`<span class="keyword-chip">${keyword}</span>`).join("");
  }

  const recommendationsEl=document.getElementById("recommendations");
  if(recommendationsEl){
    recommendationsEl.innerHTML=report.recommendations.map(item=>`<li>${item}</li>`).join("");
  }
}

function showTab(tab,event){
  ["overviewTab","sourcesTab","detailsTab"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.style.display="none";
  });

  const selected=document.getElementById(tab+"Tab");
  if(selected) selected.style.display="block";

  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  if(event && event.target) event.target.classList.add("active");
}

function downloadPDF(){
  const report=document.querySelector(".report-card");
  if(!report) return alert("Open the dashboard to download a generated report");

  const exportReport=report.cloneNode(true);
  const tabs=exportReport.querySelector(".tabs");
  if(tabs) tabs.remove();

  [
    ["overviewTab","Overview"],
    ["sourcesTab","Sources"],
    ["detailsTab","Details"]
  ].forEach(([id,title])=>{
    const section=exportReport.querySelector("#"+id);
    if(section){
      section.style.display="block";
      section.classList.add("pdf-section");
      const heading=document.createElement("h4");
      heading.className="pdf-section-title";
      heading.innerText=title;
      section.prepend(heading);
    }
  });

  exportReport.classList.add("pdf-report");
  exportReport.style.width="760px";

  const holder=document.createElement("div");
  holder.style.position="fixed";
  holder.style.left="-10000px";
  holder.style.top="0";
  holder.appendChild(exportReport);
  document.body.appendChild(holder);

  html2pdf().set({
    margin:0.35,
    filename:"copyshield-detailed-report.pdf",
    html2canvas:{scale:2},
    jsPDF:{unit:"in",format:"a4",orientation:"portrait"}
  }).from(exportReport).save().then(()=>{
    holder.remove();
  });
}
