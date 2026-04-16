import React, { useState, useEffect, useRef } from 'react';
import { Clock, Plus, Trash2, Volume2, AlertCircle, Play, Settings, Edit3, CheckCircle2 } from 'lucide-react';

// --- 音效產生器 (Web Audio API) ---
const playTone = (frequency: number, type: OscillatorType, duration: number, vol = 0.5) => {
  const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
  if (!AudioContextClass) return;
  
  const audioCtx = new AudioContextClass();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

const playReadySound = () => {
  // 考前2分鐘預備音：輕快的三連音
  setTimeout(() => playTone(659, 'sine', 0.2), 0);     // Mi
  setTimeout(() => playTone(784, 'sine', 0.2), 300);   // Sol
  setTimeout(() => playTone(1046, 'sine', 0.4), 600);  // Do
};

const playWarningSound = () => {
  // 剩餘5分鐘警告音：短促的叮咚聲
  setTimeout(() => playTone(880, 'sine', 0.5), 0);
  setTimeout(() => playTone(880, 'sine', 0.5), 600);
  setTimeout(() => playTone(1046, 'sine', 0.8), 1200);
};

const playEndSound = () => {
  // 結束音：長聲鈴響
  playTone(600, 'square', 2.0, 0.2);
  setTimeout(() => playTone(600, 'square', 2.0, 0.2), 2200);
};

// --- 輔助函數 ---
const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-TW', { hour12: false });
};

const formatCountdown = (ms: number) => {
  if (ms < 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatShortCountdown = (ms: number) => {
  if (ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const addMinutesToTimeStr = (timeStr: string, minutesToAdd: number) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const getSubjectEmoji = (subject: string) => {
  if (subject.includes('國語') || subject.includes('國文')) return '📖';
  if (subject.includes('數學')) return '📏';
  if (subject.includes('英語') || subject.includes('英文')) return '🔤';
  if (subject.includes('自然')) return '🌱';
  if (subject.includes('社會')) return '🌍';
  if (subject.includes('健康') || subject.includes('體育')) return '⚽';
  if (subject.includes('綜合')) return '🎨';
  return '📝';
};

interface Exam {
  id: number;
  subject: string;
  startTime: string;
  duration: number;
  notes: string;
}

export default function App() {
  const [mode, setMode] = useState<'setup' | 'exam'>('setup'); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [schedule, setSchedule] = useState<Exam[]>([
    { id: 1, subject: '國語', startTime: '08:30', duration: 40, notes: '第一大題為單選題，請注意畫卡。' },
    { id: 2, subject: '數學', startTime: '10:30', duration: 40, notes: '第5題題目有誤，請看黑板修正哦！' },
    { id: 3, subject: '英語', startTime: '13:30', duration: 40, notes: '包含聽力測驗，請注意聽廣播 🎧' }
  ]);
  const [generalNotes, setGeneralNotes] = useState('1. 🤫 考試期間請保持安靜\n2. ✏️ 桌面清空，只留文具\n3. 👀 寫完請仔細檢查，安靜等待交卷');

  const alertedRef = useRef<Record<number, { ready: boolean; warning: boolean; end: boolean; start: boolean }>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (mode === 'exam') {
        checkAlerts(now);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, schedule]);

  const checkAlerts = (now: Date) => {
    schedule.forEach(exam => {
      const start = parseTime(exam.startTime);
      const endStr = addMinutesToTimeStr(exam.startTime, exam.duration);
      const end = parseTime(endStr);
      
      if (!alertedRef.current[exam.id]) {
        alertedRef.current[exam.id] = { ready: false, warning: false, end: false, start: false };
      }

      const status = alertedRef.current[exam.id];
      const timeToStart = start.getTime() - now.getTime();
      const timeLeft = end.getTime() - now.getTime();

      // 考前 2 分鐘 (120,000 毫秒) 預備音
      if (timeToStart <= 120000 && timeToStart > 0 && !status.ready) {
        playReadySound();
        status.ready = true;
      }

      // 考試開始輕聲提示
      if (now >= start && now < end && !status.start) {
        playTone(1200, 'sine', 0.5);
        status.start = true;
      }

      // 考試結束前 5 分鐘 (300,000 毫秒) 警告音
      if (now >= start && timeLeft <= 300000 && timeLeft > 0 && !status.warning) {
        playWarningSound();
        status.warning = true;
      }

      // 考試結束提醒
      if (now >= start && timeLeft <= 0 && !status.end && timeLeft > -5000) {
        playEndSound();
        status.end = true;
      }
    });
  };

  const addExam = () => {
    const newId = schedule.length > 0 ? Math.max(...schedule.map(e => e.id)) + 1 : 1;
    setSchedule([...schedule, { id: newId, subject: '國語', startTime: '08:00', duration: 40, notes: '' }]);
  };

  const updateExam = (id: number, field: keyof Exam, value: string | number) => {
    setSchedule(schedule.map(exam => exam.id === id ? { ...exam, [field]: value } : exam));
  };

  const removeExam = (id: number) => {
    setSchedule(schedule.filter(exam => exam.id !== id));
  };

  const testAudio = (type: 'ready' | 'warning') => {
    if (type === 'ready') playReadySound();
    if (type === 'warning') playWarningSound();
  };

  const startExamMode = () => {
    alertedRef.current = {};
    playTone(440, 'sine', 0.01, 0);
    setMode('exam');
  };

  // --- Exam 模式邏輯 ---
  let activeExam: Exam | null = null;
  let nextExam: Exam | null = null;
  let examStatus: 'waiting' | 'preparing' | 'inprogress' | 'just_ended' | 'finished' = 'waiting'; 

  if (mode === 'exam') {
    const sortedSchedule = [...schedule].sort((a, b) => parseTime(a.startTime).getTime() - parseTime(b.startTime).getTime());
    
    for (let exam of sortedSchedule) {
      const start = parseTime(exam.startTime);
      const endStr = addMinutesToTimeStr(exam.startTime, exam.duration);
      const end = parseTime(endStr);
      const timeToStart = start.getTime() - currentTime.getTime();
      const timeSinceEnd = currentTime.getTime() - end.getTime();

      if (currentTime >= start && currentTime < end) {
        activeExam = exam;
        examStatus = 'inprogress';
        break;
      } else if (timeSinceEnd >= 0 && timeSinceEnd < 120000) {
        activeExam = exam;
        examStatus = 'just_ended';
        break;
      } else if (timeToStart > 0 && timeToStart <= 120000) {
        nextExam = exam;
        examStatus = 'preparing';
        break;
      } else if (currentTime < start && !nextExam) {
        nextExam = exam;
      }
    }

    if (!activeExam && examStatus !== 'preparing' && examStatus !== 'just_ended' && !nextExam && sortedSchedule.length > 0) {
      const lastExam = sortedSchedule[sortedSchedule.length - 1];
      const lastEndStr = addMinutesToTimeStr(lastExam.startTime, lastExam.duration);
      if (currentTime >= parseTime(lastEndStr)) {
        examStatus = 'finished';
      }
    }
  }

  const extendActiveExam = (minutes: number) => {
    if (!activeExam) return;
    
    setSchedule(prev => prev.map(exam => 
      exam.id === (activeExam as Exam).id ? { ...exam, duration: Number(exam.duration) + minutes } : exam
    ));

    if (alertedRef.current[activeExam.id]) {
      alertedRef.current[activeExam.id].warning = false;
      alertedRef.current[activeExam.id].end = false;
    }
  };

  // --- 渲染：設定模式 (Setup) ---
  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-sky-50 p-6 font-sans text-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-[2rem] shadow-sm border-4 border-white/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative z-10">
              <h1 className="text-3xl font-black text-sky-600 flex items-center gap-3">
                <Settings className="w-8 h-8" />
                🏫 考試計時系統設定
              </h1>
              <p className="text-gray-500 mt-2 font-medium">請設定考科時間，系統會自動在考前2分鐘、結束前5分鐘與結束時發出提醒音哦！</p>
            </div>
            <div className="flex gap-4 relative z-10">
               <div className="flex flex-col gap-2">
                <button 
                  onClick={() => testAudio('ready')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors font-bold text-sm shadow-sm"
                >
                  <Volume2 className="w-4 h-4" />
                  試聽考前預備音
                </button>
                <button 
                  onClick={() => testAudio('warning')}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-bold text-sm shadow-sm"
                >
                  <Volume2 className="w-4 h-4" />
                  試聽剩餘5分鐘
                </button>
              </div>
              <button 
                onClick={startExamMode}
                className="flex items-center gap-2 px-6 py-2 bg-sky-500 text-white rounded-2xl hover:bg-sky-600 transition-colors font-black shadow-md shadow-sky-200 text-lg"
              >
                <Play className="w-6 h-6" />
                進入考試模式 🚀
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] shadow-sm">
                <h2 className="text-2xl font-black flex items-center gap-2 text-sky-700">
                  <Clock className="w-7 h-7" />
                  考試時間表
                </h2>
                <button 
                  onClick={addExam}
                  className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-4 py-2 rounded-xl"
                >
                  <Plus className="w-5 h-5" /> 新增考科
                </button>
              </div>

              <div className="space-y-5">
                {schedule.map((exam) => (
                  <div key={exam.id} className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-sky-100 flex flex-col gap-4 relative">
                    <div className="absolute top-6 left-4 text-2xl opacity-50">{getSubjectEmoji(exam.subject)}</div>
                    <div className="flex flex-wrap md:flex-nowrap gap-4 items-start pl-10">
                      <div className="flex-1 space-y-1">
                        <label className="text-sm font-bold text-gray-500">科目名稱</label>
                        <select 
                          value={exam.subject}
                          onChange={(e) => updateExam(exam.id, 'subject', e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all font-bold text-lg text-gray-700 bg-white"
                        >
                          <option value="國語">國語</option>
                          <option value="數學">數學</option>
                          <option value="英語">英語</option>
                          <option value="自然">自然</option>
                          <option value="社會">社會</option>
                        </select>
                      </div>
                      <div className="w-36 space-y-1">
                        <label className="text-sm font-bold text-gray-500">開始時間</label>
                        <input 
                          type="time" 
                          value={exam.startTime}
                          onChange={(e) => updateExam(exam.id, 'startTime', e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all font-bold text-gray-700"
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <label className="text-sm font-bold text-gray-500">時間(分鐘)</label>
                        <input 
                          type="number" 
                          min="1"
                          value={exam.duration}
                          onChange={(e) => updateExam(exam.id, 'duration', parseInt(e.target.value) || 0)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all font-bold text-gray-700"
                        />
                      </div>
                      <div className="pt-7">
                        <button 
                          onClick={() => removeExam(exam.id)}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="刪除考科"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-100 ml-10">
                      <label className="text-sm font-bold text-yellow-700 flex items-center gap-1">
                        <Edit3 className="w-4 h-4" /> 該科專屬小叮嚀 / 考題修改 (選填)
                      </label>
                      <textarea 
                        value={exam.notes}
                        onChange={(e) => updateExam(exam.id, 'notes', e.target.value)}
                        placeholder="例如：第10題選項(C)改為..."
                        rows={2}
                        className="w-full p-3 border-2 border-yellow-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 outline-none text-base font-medium resize-none bg-white"
                      />
                    </div>
                  </div>
                ))}
                {schedule.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-[2rem] border-4 border-dashed border-sky-200 text-sky-500 font-bold text-lg">
                    目前沒有任何考科，請點擊上方按鈕新增哦！
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-gray-100">
                <h2 className="text-xl font-black flex items-center gap-2 text-orange-500 mb-4">
                  <AlertCircle className="w-6 h-6" />
                  通用考場規則
                </h2>
                <textarea 
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={8}
                  placeholder="輸入要顯示在畫面上的通用注意事項..."
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none text-gray-700 font-medium leading-relaxed resize-none"
                />
              </div>

              <div className="bg-sky-100 p-6 rounded-[2rem]">
                <h3 className="font-black text-sky-800 mb-3 text-lg">💡 系統階段說明</h3>
                <ul className="text-sm text-sky-700 space-y-3 font-medium">
                  <li className="flex items-start gap-2"><span className="text-orange-500">預備</span> 考前 2 分鐘響起預備鈴並紅字提醒回座</li>
                  <li className="flex items-start gap-2"><span className="text-green-500">考試</span> 考試開始自動跳出巨大倒數器</li>
                  <li className="flex items-start gap-2"><span className="text-red-500">警告</span> 結束前 5 分鐘數字變紅閃爍並響鈴</li>
                  <li className="flex items-start gap-2"><span className="text-red-700 font-bold">結束</span> 結束時全紅屏閃爍「時間結束請停筆」</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 渲染：考試模式 (Exam Mode) ---
  const activeExamEndStr = activeExam ? addMinutesToTimeStr(activeExam.startTime, activeExam.duration) : null;
  const nextExamEndStr = nextExam ? addMinutesToTimeStr(nextExam.startTime, nextExam.duration) : null;

  const isWarning = activeExam && activeExamEndStr && (parseTime(activeExamEndStr).getTime() - currentTime.getTime() <= 300000); // 剩餘 5 分鐘警告
  const isCritical = activeExam && activeExamEndStr && (parseTime(activeExamEndStr).getTime() - currentTime.getTime() <= 60000);  // 剩餘 1 分鐘緊急

  let bgClass = 'bg-sky-50 text-gray-800'; 
  if (examStatus === 'inprogress') {
    if (isCritical) {
      bgClass = 'bg-red-500 text-white'; 
    } else if (isWarning) {
      bgClass = 'bg-red-50 text-gray-800'; 
    } else {
      bgClass = 'bg-green-50 text-gray-800'; 
    }
  } else if (examStatus === 'preparing') {
    bgClass = 'bg-orange-50 text-gray-800'; 
  } else if (examStatus === 'just_ended') {
    bgClass = 'bg-red-800 text-white'; // 考試剛結束的全紅背景
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-1000 ${bgClass} font-sans`}>
      
      <div className="flex justify-between items-center p-4 px-8 border-b-4 border-white/60 bg-white/40 backdrop-blur-md shadow-sm z-10">
        <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-full shadow-sm">
          <Clock className="w-8 h-8 text-sky-500" />
          <div className="text-3xl font-black tracking-widest text-gray-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(currentTime)}
          </div>
        </div>
        <div>
          <button 
            onClick={() => setMode('setup')}
            className="px-5 py-2.5 bg-white/80 hover:bg-white rounded-full text-sm font-bold text-gray-600 shadow-sm transition-all"
          >
            退出考試模式 ⚙️
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-y-auto">
          
          {examStatus === 'waiting' && (
            <div className="text-center animate-fade-in w-full max-w-3xl">
              <div className="inline-block bg-white px-8 py-3 rounded-full shadow-sm mb-12">
                <h2 className="text-4xl text-sky-500 font-black tracking-wide">
                  🧸 下課休息時間
                </h2>
              </div>
              
              {nextExam ? (
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border-8 border-sky-100 relative mt-8">
                  <p className="text-2xl text-gray-400 mb-4 font-bold">下一節要考什麼呢？</p>
                  <p className="text-7xl font-black text-sky-600 mb-6 flex items-center justify-center gap-4">
                    <span>{getSubjectEmoji(nextExam.subject)}</span>
                    {nextExam.subject}
                  </p>
                  <div className="inline-block bg-gray-100 px-8 py-3 rounded-2xl">
                    <p className="text-4xl text-gray-600 font-black tracking-wider">
                      {nextExam.startTime} - {nextExamEndStr}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-20">
                  <p className="text-3xl text-gray-400 font-bold">本日尚無排定之考試 💤</p>
                </div>
              )}
            </div>
          )}

          {examStatus === 'preparing' && nextExam && (
             <div className="text-center animate-fade-in w-full max-w-4xl flex flex-col items-center">
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl border-[12px] border-orange-300 relative w-full transform transition-transform hover:scale-[1.02]">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-10 py-3 rounded-full font-black text-3xl shadow-lg whitespace-nowrap animate-bounce flex items-center gap-3">
                  🔔 要考試了，趕快回座位坐好哦！ 🔔
                </div>
                
                <p className="text-3xl text-orange-600 mb-4 font-black mt-6">準備考：</p>
                <p className="text-7xl font-black text-gray-800 mb-8 flex items-center justify-center gap-4">
                  <span>{getSubjectEmoji(nextExam.subject)}</span>
                  {nextExam.subject}
                </p>
                
                <div className="bg-orange-50 rounded-[2rem] p-8 border-4 border-orange-200">
                  <p className="text-2xl text-orange-800 font-bold mb-4">距離開始還有</p>
                  <div className="font-black text-orange-600 tracking-tighter" style={{ fontSize: 'clamp(5rem, 12vw, 8rem)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatShortCountdown(parseTime(nextExam.startTime).getTime() - currentTime.getTime())}
                  </div>
                </div>
              </div>
            </div>
          )}

          {examStatus === 'just_ended' && activeExam && (
            <div className="text-center animate-fade-in w-full max-w-4xl flex flex-col items-center">
              <div className="bg-red-600 p-16 rounded-[4rem] shadow-2xl border-[16px] border-red-400 relative w-full animate-pulse transform scale-105">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-red-900 text-white px-10 py-3 rounded-full font-black text-3xl shadow-lg whitespace-nowrap">
                  🚨 鐘聲已響 🚨
                </div>
                <h2 className="text-7xl md:text-8xl font-black text-white tracking-widest mb-8 mt-6">
                  考試時間結束
                </h2>
                <div className="bg-red-900/40 rounded-[2rem] p-8 border-4 border-red-400">
                  <p className="text-5xl font-black text-red-100 mb-4 tracking-wider">
                    請立刻停筆！
                  </p>
                  <p className="text-3xl font-bold text-red-200 mt-6">
                    雙手放桌面，安靜等待老師收卷
                  </p>
                </div>
              </div>
            </div>
          )}

          {examStatus === 'finished' && (
            <div className="text-center bg-white p-16 rounded-[3rem] shadow-xl border-8 border-green-100">
              <h2 className="text-5xl md:text-7xl font-black text-green-500 mb-8">
                🎉 本日考試已全數結束 🎉
              </h2>
              <p className="text-3xl text-gray-600 font-bold">各位小朋友辛苦了！🥳 趕快收拾書包回家吧！</p>
            </div>
          )}

          {examStatus === 'inprogress' && activeExam && activeExamEndStr && (
            <div className="text-center w-full max-w-5xl flex flex-col items-center">
              
              <div className="flex flex-col items-center mb-8">
                <div className="bg-white/90 px-10 py-4 rounded-full shadow-md mb-6 flex items-center gap-4 border-4 border-white">
                  <span className="text-5xl">{getSubjectEmoji(activeExam.subject)}</span>
                  <h2 className="text-5xl md:text-6xl font-black text-gray-800 tracking-wider">
                    {activeExam.subject}
                  </h2>
                </div>
                <div className={`px-8 py-2 rounded-full font-black text-2xl tracking-widest ${
                  isCritical ? 'bg-white text-red-600' : 'bg-white/60 text-gray-600'
                }`}>
                  {activeExam.startTime} - {activeExamEndStr}
                </div>
              </div>
              
              <div className={`relative px-12 py-8 rounded-[4rem] shadow-2xl border-[12px] transition-all duration-500 ${
                  isCritical 
                    ? 'bg-white border-red-200' 
                    : isWarning 
                      ? 'bg-white border-red-400 animate-pulse' 
                      : 'bg-white border-green-400'
                }`}>
                
                {isWarning && !isCritical && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-8 py-2 rounded-full font-black text-xl shadow-lg whitespace-nowrap animate-bounce">
                    🚨 最後衝刺！剩不到 5 分鐘！ 🚨
                  </div>
                )}
                
                {isCritical && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-700 text-white px-8 py-2 rounded-full font-black text-xl shadow-lg whitespace-nowrap animate-bounce">
                    ⏰ 時間快到囉，請檢查考卷！ ⏰
                  </div>
                )}

                <div className={`font-black leading-none tracking-tighter ${
                    isCritical 
                      ? 'text-red-600' 
                      : isWarning 
                        ? 'text-red-500' 
                        : 'text-green-500'
                  }`} style={{ fontSize: 'clamp(6rem, 18vw, 16rem)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCountdown(parseTime(activeExamEndStr).getTime() - currentTime.getTime())}
                </div>
              </div>
              
              {activeExam.notes && (
                <div className="mt-12 p-8 rounded-3xl w-full max-w-3xl text-left text-2xl leading-relaxed bg-yellow-100 border-4 border-yellow-300 shadow-md relative transform -rotate-1">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-4xl">📌</div>
                  <div className="flex items-center gap-3 mb-4 text-yellow-800">
                    <span className="font-black text-3xl">老師小叮嚀</span>
                  </div>
                  <div className="whitespace-pre-wrap font-bold text-gray-700">{activeExam.notes}</div>
                </div>
              )}

              <div className="mt-12 flex items-center gap-4 opacity-20 hover:opacity-100 transition-opacity bg-white/50 px-6 py-3 rounded-full">
                <span className="text-gray-500 font-bold">老師專用(延長時間)：</span>
                <button 
                  onClick={() => extendActiveExam(1)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  + 1 分鐘
                </button>
                <button 
                  onClick={() => extendActiveExam(5)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  + 5 分鐘
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 lg:w-96 bg-white/60 backdrop-blur-md border-l-4 border-white/60 p-6 lg:p-8 flex flex-col overflow-y-auto shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          
          {generalNotes && (
            <div className="mb-10 bg-white p-6 rounded-3xl shadow-sm border-2 border-orange-100">
              <h3 className="text-xl font-black text-orange-500 mb-4 pb-3 border-b-2 border-orange-100 flex items-center gap-2">
                📋 考場小規則
              </h3>
              <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-600 font-bold">
                {generalNotes}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-sky-100 flex-1">
            <h3 className="text-xl font-black text-sky-500 mb-5 pb-3 border-b-2 border-sky-100 flex items-center gap-2">
              📅 今日考試進度
            </h3>
            <div className="space-y-4">
              {schedule.map(exam => {
                const start = parseTime(exam.startTime);
                const endStr = addMinutesToTimeStr(exam.startTime, exam.duration);
                const end = parseTime(endStr);
                
                let cardClass = "bg-gray-50 text-gray-400 border-2 border-transparent";
                let icon = <span className="w-6 text-center">{getSubjectEmoji(exam.subject)}</span>;
                let isCurrent = false;
                
                // 判斷狀態
                const timeToStart = start.getTime() - currentTime.getTime();
                const timeSinceEnd = currentTime.getTime() - end.getTime();
                const isPreparingThis = timeToStart > 0 && timeToStart <= 120000;
                const isJustEndedThis = timeSinceEnd >= 0 && timeSinceEnd < 120000;

                if (currentTime >= start && currentTime < end) {
                  isCurrent = true;
                  cardClass = isWarning 
                    ? "bg-red-50 border-2 border-red-300 text-red-700 shadow-md transform scale-105 transition-all" 
                    : "bg-sky-50 border-2 border-sky-300 text-sky-700 shadow-md transform scale-105 transition-all";
                  icon = <span className={`w-3 h-3 rounded-full animate-pulse ml-1.5 mr-1.5 ${isWarning ? 'bg-red-500' : 'bg-sky-500'}`}></span>;
                } else if (isJustEndedThis) {
                  // 剛結束的醒目標示
                  cardClass = "bg-red-100 border-2 border-red-400 text-red-800 shadow-md transform scale-105 transition-all";
                  icon = <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse ml-1.5 mr-1.5"></span>;
                } else if (isPreparingThis) {
                  cardClass = "bg-orange-50 border-2 border-orange-300 text-orange-700 shadow-md transform scale-105 transition-all";
                  icon = <span className="w-3 h-3 rounded-full bg-orange-500 animate-bounce ml-1.5 mr-1.5"></span>;
                } else if (currentTime >= end) {
                  cardClass = "bg-gray-100/50 text-gray-400 border-2 border-transparent";
                  icon = <CheckCircle2 className="w-5 h-5 text-green-400 ml-0.5 mr-0.5" />;
                }

                return (
                  <div key={exam.id} className={`p-4 rounded-2xl flex items-center gap-3 ${cardClass}`}>
                    {icon}
                    <div>
                      <div className={`text-lg font-black ${currentTime >= end && !isJustEndedThis ? 'line-through opacity-70' : ''}`}>
                        {exam.subject}
                      </div>
                      <div className="font-bold text-sm opacity-80" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {exam.startTime} - {endStr} ({exam.duration}分)
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="ml-auto text-xs font-bold px-2 py-1 bg-white rounded-lg shadow-sm text-sky-600">
                        進行中
                      </div>
                    )}
                    {isPreparingThis && (
                      <div className="ml-auto text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-lg shadow-sm animate-pulse">
                        預備中
                      </div>
                    )}
                    {isJustEndedThis && (
                      <div className="ml-auto text-xs font-black px-2 py-1 bg-red-600 text-white rounded-lg shadow-sm animate-pulse">
                        收卷中
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
