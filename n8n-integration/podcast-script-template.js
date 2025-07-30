// N8N Code Node: Create Podcast Script from AI Agent Output
// Place this code in a Code Node between AI Agent and HTTP Request (Podcast)

// Get the news text from AI Agent output
const newsOutput = $('AI Agent').first().json.output || "";

// Function to format current time in São Paulo timezone
function formatNowSP() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = type => parts.find(p => p.type === type).value;
  return {
    weekday: get("weekday"),
    day: get("day"),
    month: get("month"),
    year: get("year"),
    hour: get("hour"),
    minute: get("minute")
  };
}

// Get greeting based on current hour
function getGreeting() {
  const hourSP = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );

  if (hourSP >= 5 && hourSP < 12) {
    return "Bom dia";
  } else if (hourSP >= 12 && hourSP < 18) {
    return "Boa tarde";
  } else if (hourSP >= 18 && hourSP < 24) {
    return "Boa noite";
  } else {
    return "Boa madrugada";
  }
}

// Parse news blocks from AI Agent output
function parseNewsBlocks(text) {
  const newsBlocks = text
    .split(/(?=Title: )/)
    .map(block => block.trim())
    .filter(block => block && block.includes('Title:'));
  
  const parsedNews = [];
  
  for (const block of newsBlocks) {
    const lines = block.split('\n').map(line => line.trim());
    let news = {};
    
    for (const line of lines) {
      if (line.startsWith('Title: ')) {
        // Remove emoji and bold formatting
        news.title = line.replace('Title: ', '').replace(/[\*]/g, '').replace(/^[^\w\s]+/, '').trim();
      } else if (line.startsWith('Date of publication: ') || line.startsWith('Date and time of publication: ')) {
        news.date = line.split(': ')[1];
      } else if (line.startsWith('Summary: ')) {
        news.summary = line.replace('Summary: ', '');
      } else if (line.startsWith('link: ')) {
        news.link = line.replace('link: ', '');
      }
    }
    
    if (news.title && news.summary) {
      parsedNews.push(news);
    }
  }
  
  return parsedNews;
}

// Create podcast script
function createPodcastScript(newsArray) {
  const timeInfo = formatNowSP();
  const greeting = getGreeting();
  const episodeDate = `${timeInfo.day}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getFullYear()}`;
  
  let script = '';
  
  // Intro
  script += `[Host] ${greeting} e bem-vindos ao seu resumo diário de Inteligência Artificial! `;
  script += `Hoje é ${timeInfo.weekday}, ${timeInfo.day} de ${timeInfo.month} de ${timeInfo.year}, `;
  script += `e eu sou seu host trazendo as principais notícias do mundo da IA. `;
  script += `Este é o episódio ${episodeDate}, com ${newsArray.length} histórias selecionadas especialmente para você. `;
  script += `Vamos começar!\n\n`;
  
  // News stories
  newsArray.forEach((news, index) => {
    const storyNumber = index + 1;
    
    // Story intro with natural variations
    if (storyNumber === 1) {
      script += `[Host] Nossa primeira história de hoje: `;
    } else if (storyNumber === newsArray.length) {
      script += `[Host] E para finalizar nosso resumo de hoje: `;
    } else {
      script += `[Host] Continuando com nossa ${storyNumber}ª história: `;
    }
    
    // Add title and content
    script += `${news.title}. `;
    script += `${news.summary} `;
    
    // Add transition between stories
    if (storyNumber < newsArray.length) {
      const transitions = [
        'Agora, vamos para nossa próxima notícia.',
        'Passando para o próximo assunto.',
        'Continuando nosso resumo.',
        'Nossa próxima história também é muito interessante.'
      ];
      script += `${transitions[Math.floor(Math.random() * transitions.length)]}\n\n`;
    } else {
      script += '\n\n';
    }
  });
  
  // Outro
  script += `[Host] E essas foram as principais notícias de Inteligência Artificial de hoje. `;
  script += `Esperamos que você tenha gostado do nosso resumo. `;
  script += `Não se esqueça de acompanhar nossos próximos episódios, sempre às 9 da manhã e 9 da noite. `;
  script += `Até a próxima!`;
  
  return script;
}

// Main execution
try {
  const newsArray = parseNewsBlocks(newsOutput);
  
  if (newsArray.length === 0) {
    throw new Error('Nenhuma notícia válida encontrada no output do AI Agent');
  }
  
  const podcastScript = createPodcastScript(newsArray);
  
  // Return the script for the next node (HTTP Request to generate audio)
  return [{
    json: {
      script: podcastScript,
      newsCount: newsArray.length,
      timestamp: new Date().toISOString(),
      // Also include original news for reference
      originalNews: newsOutput
    }
  }];
  
} catch (error) {
  console.error('Erro ao criar script do podcast:', error);
  return [{
    json: {
      error: error.message,
      script: null,
      timestamp: new Date().toISOString()
    }
  }];
}