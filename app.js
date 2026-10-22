
const topicNames = {
  jobs: 'بیرونِ ملک ملازمتیں',
  quran: 'HMS قرآن اکیڈمی',
  income: 'آن لائن آمدنی'
};

let currentTopic = 'jobs';

const $ = s => document.querySelector(s);
const log = $('#chatLog');

function addMessage(text) {
  const p = document.createElement('p');
  p.textContent = text;
  log.appendChild(p);
}

document.querySelectorAll('.topic').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.topic').forEach(x =>
      x.classList.remove('active')
    );
    b.classList.add('active');
    currentTopic = b.dataset.topic;
    $('#topicLabel').textContent = topicNames[currentTopic];
  });
});

async function sendMessage() {
  const input = $('#question');
  const q = input.value.trim();
  if (!q) return;

  const btn = $('#sendBtn');
  if (btn.disabled) return;

  addMessage('آپ: ' + q);
  input.value = '';
  btn.disabled = true;

  addMessage('HMS معاون: جواب تیار ہو رہا ہے، براہِ کرم انتظار کریں۔');
  const pendingMessage = log.lastElementChild;

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
            'آپ HMS Personal AI Agent ہیں۔ ' +
            'منتخب شعبہ: ' + topicNames[currentTopic] + '۔ ' +
            'صارف کا سوال: ' + q +
            '۔ اردو میں جواب دیں۔ تصدیق کے بغیر معلومات کو یقینی نہ کہیں۔'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error('درخواست مکمل نہیں ہوئی۔');
    }

    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('AI کا جواب موصول نہیں ہوا۔');
    }

    pendingMessage.textContent = 'HMS معاون: ' + answer;
  } catch (error) {
    pendingMessage.textContent =
      'HMS معاون: رابطے میں مسئلہ آیا۔ انٹرنیٹ چیک کرکے دوبارہ کوشش کریں۔';
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

$('#sendBtn')?.addEventListener('click', sendMessage);

$('#question')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

const taskInput = $('#taskInput');
const taskList = $('#taskList');
let tasks = [];

try {
  tasks = JSON.parse(localStorage.getItem('hmsTasks') || '[]');
  if (!Array.isArray(tasks)) tasks = [];
} catch {
  tasks = [];
}

function renderTasks() {
  taskList.innerHTML = '';

  tasks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'task-row';

    const label = document.createElement('span');
    label.textContent = (t.done ? '✓ ' : '') + t.text;
    label.style.textDecoration = t.done ? 'line-through' : 'none';

    label.onclick = () => {
      tasks[i].done = !tasks[i].done;
      saveTasks();
    };

    const del = document.createElement('button');
    del.textContent = 'حذف';
    del.onclick = () => {
      tasks.splice(i, 1);
      saveTasks();
    };

    row.append(label, del);
    taskList.append(row);
  });

  localStorage.setItem('hmsTasks', JSON.stringify(tasks));
}

function saveTasks() {
  renderTasks();
}

$('#addTaskBtn')?.addEventListener('click', () => {
  const t = taskInput.value.trim();
  if (!t) return;

  tasks.push({ text: t, done: false });
  taskInput.value = '';
  saveTasks();
});

renderTasks();

let installPrompt;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  $('#installBtn').hidden = false;
});

$('#installBtn')?.addEventListener('click', async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
  } else {
    alert('براؤزر کے مینو سے Add to Home screen منتخب کریں۔');
  }
});

if ('serviceWorker' in navigator &&
    location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
