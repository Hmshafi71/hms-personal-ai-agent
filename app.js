

const topicNames = {
  jobs: 'Overseas jobs',
  quran: 'HMS Quran Academy',
  income: 'Online income'
};

const $ = selector => document.querySelector(selector);
const log = $('#chatLog');
const chatForm = $('#chatForm');
const userInput = $('#userInput');
const sendButton = chatForm.querySelector('button[type="submit"]');
const languageSelect = $('#languageSelect');

let currentTopic = null;

const languages = {
  auto: 'the same language as the user’s question',
  ur: 'Urdu, using Pakistani Urdu script',
  en: 'English',
  ar: 'Arabic',
  hi: 'Hindi',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  zh: 'Chinese',
  ja: 'Japanese',
  other: 'the language used in the user’s question'
};

const speechLanguages = {
  ur: 'ur-PK',
  en: 'en-US',
  ar: 'ar-SA',
  hi: 'hi-IN',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
  auto: 'ur-PK',
  other: 'ur-PK'
};

function addMessage(text, type = 'agent') {
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (type === 'user' ? 'user' : 'agent');

  const heading = document.createElement('b');
  heading.textContent = type === 'user' ? 'آپ' : 'HMS ایجنٹ';

  const paragraph = document.createElement('p');
  paragraph.textContent = text;

  bubble.append(heading, paragraph);
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;

  return paragraph;
}

// شعبہ صرف اسی وقت منتخب ہوگا جب صارف خود منتخب کرے
document.querySelectorAll('.module').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.module').forEach(item => {
      item.classList.remove('active');
    });

    button.classList.add('active');
    currentTopic = button.dataset.topic;
  });
});

// مائیک
const micButton = document.createElement('button');
micButton.type = 'button';
micButton.textContent = '🎙️ بولیں';
micButton.className = 'mic-btn';
micButton.setAttribute('aria-label', 'مائیک سے سوال بولیں');
chatForm.insertBefore(micButton, sendButton);

let recognition = null;
let isListening = false;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

function updateSpeechLanguage() {
  if (recognition) {
    recognition.lang =
      speechLanguages[languageSelect?.value || 'auto'] || 'ur-PK';
  }
}

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  updateSpeechLanguage();

  languageSelect?.addEventListener('change', updateSpeechLanguage);

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = '⏹️ سن رہا ہوں…';
  };

  recognition.onresult = event => {
    userInput.value = event.results[0][0].transcript;
    userInput.focus();
  };

  recognition.onerror = () => {
    addMessage('مائیک استعمال نہیں ہو سکا۔ اجازت چیک کریں یا سوال لکھ کر بھیجیں۔');
  };

  recognition.onend = () => {
    isListening = false;
    micButton.textContent = '🎙️ بولیں';
  };

  micButton.addEventListener('click', () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    updateSpeechLanguage();

    try {
      recognition.start();
    } catch {
      addMessage('مائیک دوبارہ شروع کرنے سے پہلے ایک لمحہ انتظار کریں۔');
    }
  });
} else {
  micButton.addEventListener('click', () => {
    addMessage('اس براؤزر میں مائیک کی سہولت دستیاب نہیں۔ سوال لکھ کر بھیجیں۔');
  });
}

// AI سے رابطہ
chatForm.addEventListener('submit', async event => {
  event.preventDefault();

  const question = userInput.value.trim();
  if (!question || sendButton.disabled) return;

  addMessage(question, 'user');
  userInput.value = '';
  sendButton.disabled = true;

  const pending = addMessage('جواب تیار ہو رہا ہے، براہِ کرم انتظار کریں۔');

  const selectedLanguage = languageSelect?.value || 'auto';
  const languageInstruction =
    languages[selectedLanguage] || languages.auto;

  let prompt =
    'You are HMS Personal AI Agent. Reply in ' +
    languageInstruction +
    '. Be concise, accurate, and relevant. Do not add unrelated suggestions. ';

  if (currentTopic) {
    prompt += 'The user selected this topic: ' +
      topicNames[currentTopic] + '. ';
  }

  prompt += 'User question: ' + question;

  try {
    let response;
    let data;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        try {
          response = await fetch(
            'https://hms-personal-ai-agent.hmscareerdesk.workers.dev/',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: prompt }),
              signal: controller.signal
            }
          );
        } finally {
          clearTimeout(timeout);
        }

        const raw = await response.text();

        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error('سرور سے درست جواب موصول نہیں ہوا۔');
        }

        if (!response.ok) {
          throw new Error(data.error || 'AI درخواست مکمل نہیں ہوئی۔');
        }

        break;
      } catch (error) {
        if (attempt === 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    const answer =
      data?.choices?.[0]?.message?.content ||
      data?.response ||
      data?.result?.response;

    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error('AI کا جواب خالی موصول ہوا۔');
    }

    pending.textContent = answer.trim();
    } catch (error) {
    console.error('HMS AI connection error:', error);

    pending.textContent =
      'خرابی کی تفصیل: ' +
      (error.name === 'AbortError'
        ? 'درخواست کا وقت ختم ہوگیا۔'
        : error.message || String(error));
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});

// چیٹ صاف کریں
$('#clearChat')?.addEventListener('click', () => {
  log.innerHTML = '';
  addMessage('السلام علیکم! اپنا سوال لکھیں یا مائیک سے بولیں۔');
});

// کاموں کی فہرست
const taskForm = $('#taskForm');
const taskInput = $('#taskInput');
const taskCategory = $('#taskCategory');
const taskList = $('#taskList');

let tasks = [];

try {
  const saved = JSON.parse(localStorage.getItem('hmsTasks') || '[]');
  if (Array.isArray(saved)) tasks = saved;
} catch {
  tasks = [];
}

function saveTasks() {
  try {
    localStorage.setItem('hmsTasks', JSON.stringify(tasks));
  } catch {
    addMessage('کام محفوظ نہیں ہو سکا۔ براؤزر کی اسٹوریج چیک کریں۔');
  }
  renderTasks();
}

function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach((task, index) => {
    const item = document.createElement('li');
    item.className = 'task-row';

    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(task.done);

    const text = document.createElement('span');
    text.textContent =
      (task.category ? task.category + ': ' : '') + task.text;
    text.style.textDecoration = task.done ? 'line-through' : 'none';

    checkbox.addEventListener('change', () => {
      tasks[index].done = checkbox.checked;
      saveTasks();
    });

    label.append(checkbox, text);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'حذف';

    remove.addEventListener('click', () => {
      tasks.splice(index, 1);
      saveTasks();
    });

    item.append(label, remove);
    taskList.appendChild(item);
  });
}

taskForm.addEventListener('submit', event => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  tasks.push({
    text,
    category: taskCategory.value,
    done: false
  });

  taskInput.value = '';
  saveTasks();
});

renderTasks();

// ایپ انسٹال کرنے کی سہولت
let installPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;

  const installButton = $('#installBtn');
  if (installButton) installButton.hidden = false;
});

$('#installBtn')?.addEventListener('click', async () => {
  if (!installPrompt) {
    alert('براؤزر کے مینو سے Add to Home screen منتخب کریں۔');
    return;
  }

  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
});

// آف لائن فائلوں کی رجسٹریشن
if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
