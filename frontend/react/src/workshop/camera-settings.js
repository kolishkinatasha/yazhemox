const storageKey = 'yazhemoh-camera-v1';
const defaults = { zoom: 125, exposure: .1, shadows: 0, blur: 19, focus: 97, grain: 33, smoothing: 'high' };
const signed = new Intl.NumberFormat('ru', { signDisplay: 'exceptZero', maximumFractionDigits: 2 });

export function createCameraSettings({ software, onChange, onOpen }) {
  const panel = document.querySelector('#camera-panel');
  const toggle = document.querySelector('#camera-toggle');
  const close = panel.querySelector('#camera-close');
  const status = panel.querySelector('#camera-status');
  const inputs = [...panel.querySelectorAll('[data-camera]')];
  const byKey = new Map(inputs.map(input => [input.dataset.camera, input]));
  const importFile = panel.querySelector('#camera-file');
  const restore = panel.querySelector('#camera-restore');
  let saved;
  let message = '';

  function decode(data) {
    if (!data || data.version !== 1 || !data.settings) throw new Error('Invalid camera profile');
    return Object.fromEntries(inputs.map(input => {
      const key = input.dataset.camera;
      const value = data.settings[key];
      if (input.type === 'range' && Number.isFinite(value)) {
        return [key, Math.max(Number(input.min), Math.min(Number(input.max), value))];
      }
      if (input.tagName === 'SELECT' && [...input.options].some(option => option.value === value)) {
        return [key, value];
      }
      throw new Error('Invalid camera setting');
    }));
  }

  const encode = settings => JSON.stringify({ version: 1, settings }, null, 2);
  try {
    const data = localStorage.getItem(storageKey);
    if (data) saved = decode(JSON.parse(data));
  } catch {
    message = 'Не удалось прочитать сохранённые настройки.';
  }
  let settings = saved ?? defaults;

  function report(text) {
    status.textContent = text ?? (settings === saved ? 'Сохранено в этом браузере.' : 'Изменения ещё не сохранены.');
  }

  function use(next) {
    // Range controls normalize the values to the same steps for display and rendering.
    const previous = settings;
    settings = { ...next };
    for (const input of inputs) {
      const key = input.dataset.camera;
      input.value = settings[key];
      if (input.type !== 'range') continue;
      const value = input.valueAsNumber;
      settings[key] = value;
      const formatted = key === 'exposure' ? signed.format(value) + ' EV' : value + '%';
      const output = panel.querySelector(`output[for="${input.id}"]`);
      if (output.textContent !== formatted) {
        output.textContent = formatted;
        input.setAttribute('aria-valuetext', formatted);
      }
    }
    const matches = saved && inputs.every(input => settings[input.dataset.camera] === saved[input.dataset.camera]);
    if (matches) settings = saved;
    byKey.get('focus').disabled = software || settings.blur === 0;
    onChange(settings, previous);
  }

  function setOpen(open, returnFocus = false) {
    if (open === !panel.hidden) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      onOpen();
      close.focus();
    } else if (returnFocus) {
      const target = toggle.getClientRects().length ? toggle : toggle.closest('.view-settings')?.querySelector('.view-settings-toggle');
      target?.focus();
    }
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  close.addEventListener('click', () => setOpen(false, true));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setOpen(false, true);
    }
  });
  if (software) {
    for (const key of ['blur', 'smoothing']) byKey.get(key).disabled = true;
    panel.querySelector('#camera-webgl-note').hidden = false;
  }

  for (const input of inputs) input.addEventListener('input', () => {
    const value = input.type === 'range' ? input.valueAsNumber : input.value;
    use({ ...settings, [input.dataset.camera]: value });
    report();
  });

  panel.querySelector('#camera-save').addEventListener('click', () => {
    try {
      localStorage.setItem(storageKey, encode(settings));
      saved = settings;
      restore.disabled = false;
      report();
    } catch {
      report('Браузер не сохранил настройки. Можно скачать JSON.');
    }
  });
  restore.disabled = !saved;
  restore.addEventListener('click', () => {
    use(saved);
    report();
  });
  panel.querySelector('#camera-reset').addEventListener('click', () => {
    use(defaults);
    report(settings === saved ? undefined : 'Исходные настройки применены.');
  });
  panel.querySelector('#camera-export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([encode(settings)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'yazhemoh-camera.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  panel.querySelector('#camera-import').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', async () => {
    const [file] = importFile.files;
    importFile.value = '';
    if (!file) return;
    try {
      if (file.size > 16384) throw new Error('Invalid camera profile size');
      use(decode(JSON.parse(await file.text())));
      report(settings === saved ? undefined : 'Профиль загружен. Сохраните его, если хотите оставить.');
    } catch {
      report('Не удалось прочитать профиль камеры.');
    }
  });

  use(settings);
  report(message || (saved ? undefined : ''));
  return { get settings() { return settings; }, close: () => setOpen(false) };
}

