
const topicNames = {
  jobs: 'بیرونِ ملک نوکریاں',
  quran: 'HMS قرآن اکیڈمی',
  income: 'آن لائن آمدنی'
};

let currentTopic = 'jobs';

const $ = selector => document.querySelector(selector);
const log = $('#chatLog');
const chatForm = $('#chatForm');
const userInput = $('#userInput');
const sendButton = chatForm.querySelector('button[type="submit"]');

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

// شعبہ منتخب کریں
document.querySelectorAll('.module').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.module').forEach(item => {
      item.classList.remove('active');
    });

    button.classList.add('active');
    currentTopic = button.dataset.topic;
    $('#topicLabel')?.textContent;
  });
});

// مائیک کا بٹن شامل کریں
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

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'ur-PK';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = '⏹️ سن رہا ہوں…';
  };

  recognition.onresult = event => {
    const spokenText = event.results[0][0].transcript;
    userInput.value = spokenText;
    userInput.focus();
  };

  recognition.onerror = () => {
    addMessage(
      'مائیک استعمال نہیں ہو سکا۔ براؤزر کی مائیک اجازت چیک کریں، یا سوال لکھ کر بھیجیں۔'
    );
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

    try {
      recognition.start();
    } catch {
      addMessage('مائیک دوبارہ استعمال کرنے سے پہلے ایک لمحہ انتظار کریں۔');
    }
  });
} else {
  micButton.addEventListener('click', () => {
    addMessage(
      'آپ کے موجودہ براؤزر میں آواز پہچاننے کی سہولت دستیاب نہیں۔ براہِ کرم سوال لکھ کر بھیجیں۔'
    );
  });
}

// اصل AI کو پیغام بھیجیں
chatForm.addEventListener('submit', async event => {
  event.preventDefault();

  const question = userInput.value.trim();
  if (!question || sendButton.disabled) return;

  addMessage(question, 'user');
  userInput.value = '';
  sendButton.disabled = true;

  const pending = addMessage('جواب تیار ہو رہا ہے، براہِ کرم انتظار کریں۔');

  try {
    const response = await fetch(
      'https://hms-personal-ai-agent.hmscareerdesk.workers.dev/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message:
            'آپ HMS Personal AI Agent ہیں۔ منتخب شعبہ: ' +
            topicNames[currentTopic] +
            '۔ صارف کا سوال: ' + question +
            '۔ صارف کی زبان کے مطابق جواب دیں۔ اردو میں پوچھا جائے تو اردو رسم الخط میں جواب دیں۔'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'درخواست مکمل نہیں ہوئی۔');
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('AI کا جواب موصول نہیں ہوا۔');
    }

    pending.textContent = answer;
  } catch (error) {
    pending.textContent =
      'معذرت، AI سے رابطہ نہیں ہو سکا۔ انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔';

    console.error('HMS AI connection error:', error);
  } finally {
    sendButton.disabled = false;
    userInput.focus();
  }
});

// چیٹ صاف کریں
$('#clearChat')?.addEventListener('click', () => {
  log.innerHTML = '';

  addMessage(
    'وعلیکم السلام! میں HMS Personal AI Agent ہوں۔ اپنا سوال لکھیں یا مائیک سے بولیں۔'
  );
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
    addMessage('کام محفوظ نہیں ہو سکا۔ اپنے براؤزر کی اسٹوریج چیک کریں۔');
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
