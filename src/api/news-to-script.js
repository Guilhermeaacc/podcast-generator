// News to Podcast Script Converter
// Converts N8N formatted news into engaging podcast script

function formatDateTimeForPodcast() {
  const now = new Date();
  const options = {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  const date = now.toLocaleDateString('pt-BR', options);
  const hour = now.getHours();
  
  let greeting;
  if (hour >= 5 && hour < 12) {
    greeting = 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Boa tarde';
  } else if (hour >= 18 && hour < 24) {
    greeting = 'Boa noite';
  } else {
    greeting = 'Boa madrugada';
  }
  
  return { date, greeting };
}

function parseNewsFromN8N(newsText) {
  // Parse the AI Agent output format
  const newsBlocks = newsText
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

function createPodcastScript(newsArray) {
  const { date, greeting } = formatDateTimeForPodcast();
  const episodeNumber = `${new Date().getDate().toString().padStart(2, '0')}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getFullYear()}`;
  
  let script = '';
  
  // Intro
  script += `[Host] ${greeting} e bem-vindos ao seu resumo diário de Inteligência Artificial! `;
  script += `Hoje é ${date}, e eu sou seu host trazendo as principais notícias do mundo da IA. `;
  script += `Este é o episódio ${episodeNumber}, com cinco histórias selecionadas especialmente para você. `;
  script += `Vamos começar!\n\n`;
  
  // News stories
  newsArray.forEach((news, index) => {
    const storyNumber = index + 1;
    
    // Story intro
    if (storyNumber === 1) {
      script += `[Host] Nossa primeira história de hoje: `;
    } else if (storyNumber === newsArray.length) {
      script += `[Host] E para finalizar nosso resumo de hoje: `;
    } else {
      script += `[Host] Continuando com nossa ${storyNumber}ª história: `;
    }
    
    // Title and content
    script += `${news.title}. `;
    script += `${news.summary} `;
    
    // Transition
    if (storyNumber < newsArray.length) {
      const transitions = [
        'Agora, vamos para nossa próxima notícia.',
        'Passando para o próximo assunto.',
        'Continuando nosso resumo.',
        'Nossa próxima história.'
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

function generateFileName() {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  return `podcast_${day}${month}${year}_${hour}${minute}.mp3`;
}

module.exports = {
  parseNewsFromN8N,
  createPodcastScript,
  generateFileName,
  formatDateTimeForPodcast
};