import React, { useState, useRef, useEffect } from 'react';
import { 
  VideoGenerationRequest, 
  AppStep, 
  GenerationLog, 
  GeneratedResult 
} from './types';
import { 
  DURATION_OPTIONS, 
  RATIO_OPTIONS, 
  STYLE_OPTIONS, 
  TONE_OPTIONS 
} from './constants';
import { 
  createVideoTask, 
  getGenerateStatus, 
  triggerRender, 
  getRenderStatus, 
  getFullAssetUrl, 
  delay 
} from './services/medeoService';
import { Icons } from './components/Icon';

const WORKFLOW_STEPS = [
  { id: 'creating', label: '创建任务', icon: Icons.Magic },
  { id: 'generating', label: '生成分镜', icon: Icons.Film },
  { id: 'rendering', label: '合成渲染', icon: Icons.Loader },
  { id: 'completed', label: '完成', icon: Icons.Check },
];

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Form State
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('15s');
  const [ratio, setRatio] = useState('16:9');
  const [style, setStyle] = useState('ghibli_style');
  const [toneId, setToneId] = useState('');

  // Execution State
  const [step, setStep] = useState<AppStep>('idle');
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Fix: Use ReturnType<typeof setInterval> instead of NodeJS.Timeout to avoid namespace error
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // To handle scrolling logs
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: GenerationLog['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  // Scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopTimer();
  }, []);

  const startTimer = () => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'dyj' && password === '1128') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('账号或密码错误');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    // Reset app state optionally
  };

  // Determine active step index for visual stepper
  const getActiveStepIndex = () => {
    if (step === 'idle') return -1;
    if (step === 'error') return -1;
    const steps = ['creating', 'generating', 'rendering', 'completed'];
    return steps.indexOf(step);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg("请输入视频描述内容。");
      return;
    }

    // Reset State
    setStep('creating');
    setLogs([]);
    setProgress(0);
    setResult(null);
    setErrorMsg(null);
    addLog("正在初始化视频生成任务...", 'info');
    startTimer();

    try {
      // 1. Create Task
      const requestPayload: VideoGenerationRequest = {
        description,
        video_duration: duration,
        canvas_ratio: ratio,
        ai_style: style,
        tone_id: toneId || undefined
      };

      const createRes = await createVideoTask(requestPayload);
      const scenarioId = createRes.id;
      addLog(`任务创建成功。任务 ID: ${scenarioId}`, 'success');
      setStep('generating');

      // 2. Poll for Generation (Storyboard)
      addLog("正在生成分镜脚本... 这可能需要几分钟。", 'info');
      
      let isGenerated = false;
      const genTimeout = 600 * 1000; // 10 mins
      const genStartTime = Date.now();
      
      while (!isGenerated) {
        if (Date.now() - genStartTime > genTimeout) throw new Error("分镜生成超时，请稍后重试。");
        
        const statusRes = await getGenerateStatus([scenarioId]);
        const task = statusRes[0];
        
        if (task.status === 'done') {
          isGenerated = true;
          addLog("分镜生成完成，准备渲染。", 'success');
          setProgress(50);
        } else if (task.status === 'error') {
          throw new Error("分镜生成失败，请检查提示词或稍后重试。");
        } else {
          // Waiting
          await delay(5000); // Check every 5s
        }
      }

      // 3. Trigger Render
      setStep('rendering');
      addLog("正在触发最终视频渲染...", 'info');
      const renderTriggerRes = await triggerRender(scenarioId);
      addLog(`渲染任务已启动。Shot ID: ${renderTriggerRes.id}`, 'info');

      // 4. Poll for Render
      let isRendered = false;
      const renderTimeout = 300 * 1000; // 5 mins
      const renderStartTime = Date.now();

      while (!isRendered) {
         if (Date.now() - renderStartTime > renderTimeout) throw new Error("视频渲染超时。");

         const renderRes = await getRenderStatus([scenarioId]);
         // API returns array of shots, we check the latest/relevant one
         const shot = renderRes.find(s => s.scenario_id === scenarioId);
         
         if (shot) {
            setProgress(50 + (shot.progress / 2)); // Map 0-100 to 50-100 total progress

            if (shot.status === 'done' && shot.progress === 100) {
              isRendered = true;
              const fullVideoUrl = getFullAssetUrl(shot.video_url);
              const fullThumbUrl = getFullAssetUrl(shot.thumb_url);
              
              setResult({
                videoUrl: fullVideoUrl,
                thumbUrl: fullThumbUrl,
                scenarioId: scenarioId
              });
              
              addLog("视频渲染完成！", 'success');
              setStep('completed');
              stopTimer();
            } else if (shot.status === 'error') {
              throw new Error("视频渲染失败。");
            }
         }
         
         if (!isRendered) await delay(3000); // Check every 3s
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "发生了未知错误。");
      addLog(err.message || "发生了未知错误。", 'error');
      setStep('error');
      stopTimer();
    }
  };

  useEffect(() => {
    console.log('[DEBUG] App mounted. isAuthenticated=', isAuthenticated);
  }, []);
  useEffect(() => {
    console.log('[DEBUG] Auth state changed. isAuthenticated=', isAuthenticated);
  }, [isAuthenticated]);

  // Login Screen
  if (!isAuthenticated) {
    console.log('[DEBUG] Rendering login screen');
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 mb-4">
              <Icons.Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Medeo 登录</h1>
            <p className="text-slate-400 text-sm">请输入授权账号以继续使用</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center">
                  <Icons.User className="w-4 h-4 mr-2" /> 账号 ID
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="请输入 ID"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center">
                  <Icons.Lock className="w-4 h-4 mr-2" /> 密码 Password
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
                <Icons.Error className="w-4 h-4 mr-2 shrink-0" />
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center group"
            >
              <span>登录系统</span>
              <Icons.ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Icons.Film className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                Medeo 视频生成器
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                基于 One2x 模型，一键生成高质量短视频
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 text-slate-500 hover:text-slate-300 transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <Icons.LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">退出登录</span>
          </button>
        </div>

        {/* Workflow Stepper */}
        {(step !== 'idle') && (
          <div className="w-full bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-sm">
             <div className="relative flex items-center justify-between max-w-3xl mx-auto">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 w-full h-0.5 bg-slate-700 -z-0"></div>
                <div 
                  className="absolute left-0 top-1/2 h-0.5 bg-indigo-500 -z-0 transition-all duration-700"
                  style={{ width: `${((getActiveStepIndex() + (step === 'completed' ? 1 : 0)) / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
                ></div>

                {WORKFLOW_STEPS.map((s, index) => {
                   const isActive = index <= getActiveStepIndex() || step === 'completed';
                   const isCurrent = index === getActiveStepIndex();
                   
                   return (
                     <div key={s.id} className="relative z-10 flex flex-col items-center group">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 
                          ${isActive 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/40' 
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                          }
                          ${isCurrent ? 'scale-110 ring-4 ring-indigo-500/20' : ''}
                        `}>
                           {isCurrent && s.id !== 'completed' ? (
                             <Icons.Loader className="w-5 h-5 animate-spin" />
                           ) : (
                             <s.icon className="w-5 h-5" />
                           )}
                        </div>
                        <span className={`mt-3 text-xs font-medium transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {s.label}
                        </span>
                     </div>
                   )
                })}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Configuration */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Icons.Magic className="w-32 h-32 text-indigo-500 transform rotate-12" />
              </div>

              <h2 className="text-lg font-semibold mb-6 flex items-center text-slate-200">
                <Icons.Magic className="w-5 h-5 mr-2 text-indigo-400" />
                生成配置 (Configuration)
              </h2>
              
              <form onSubmit={handleGenerate} className="space-y-6">
                
                {/* Prompt */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    视频描述 (Prompt)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                    placeholder="请输入视频画面的详细描述，例如：'一只可爱的橘猫在阳光下的木地板上睡觉，画面温馨治愈...'"
                    className="w-full h-32 bg-slate-900/80 border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 resize-none text-sm leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                      <Icons.Clock className="w-3 h-3 mr-1.5" /> 视频时长
                    </label>
                    <div className="relative">
                      <select 
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                        className="w-full appearance-none bg-slate-900/80 border border-slate-700 rounded-lg py-2.5 px-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                      >
                        {DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>

                  {/* Ratio */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                      <Icons.Ratio className="w-3 h-3 mr-1.5" /> 画面比例
                    </label>
                    <div className="relative">
                      <select 
                        value={ratio}
                        onChange={(e) => setRatio(e.target.value)}
                        disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                        className="w-full appearance-none bg-slate-900/80 border border-slate-700 rounded-lg py-2.5 px-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                      >
                        {RATIO_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                    <Icons.Style className="w-3 h-3 mr-1.5" /> 艺术风格
                  </label>
                  <div className="relative">
                    <select 
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                      className="w-full appearance-none bg-slate-900/80 border border-slate-700 rounded-lg py-2.5 px-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    >
                      {STYLE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center">
                    <Icons.Mic className="w-3 h-3 mr-1.5" /> 旁白配音
                  </label>
                  <div className="relative">
                    <select 
                      value={toneId}
                      onChange={(e) => setToneId(e.target.value)}
                      disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                      className="w-full appearance-none bg-slate-900/80 border border-slate-700 rounded-lg py-2.5 px-3 pr-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                    >
                      {TONE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={step !== 'idle' && step !== 'completed' && step !== 'error'}
                  className={`w-full py-4 px-4 rounded-xl font-medium text-white shadow-lg transition-all flex items-center justify-center space-x-2
                    ${(step === 'idle' || step === 'completed' || step === 'error') 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 transform hover:-translate-y-0.5' 
                      : 'bg-slate-700 cursor-not-allowed opacity-50'}`}
                >
                  {(step === 'idle' || step === 'completed' || step === 'error') ? (
                    <>
                      <Icons.Magic className="w-5 h-5" />
                      <span>开始生成视频</span>
                    </>
                  ) : (
                    <>
                      <Icons.Loader className="w-5 h-5 animate-spin" />
                      <span>正在处理中...</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Logs Console */}
            {logs.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-40 overflow-y-auto custom-scrollbar shadow-inner">
                <div className="text-slate-500 mb-2 uppercase tracking-wider text-[10px] font-bold">运行日志</div>
                {logs.map((log, idx) => (
                  <div key={idx} className={`mb-1.5 flex items-start space-x-2 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 'text-slate-400'
                  }`}>
                    <span className="opacity-50 shrink-0 select-none">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          {/* Right Column: Preview & Status */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 shadow-xl h-full flex flex-col min-h-[500px]">
              <h2 className="text-lg font-semibold mb-6 flex items-center justify-between text-slate-200">
                <div className="flex items-center">
                  <Icons.Film className="w-5 h-5 mr-2 text-indigo-400" />
                  生成结果 (Result)
                </div>
                {(step !== 'idle' && step !== 'error') && (
                  <div className="text-sm font-mono text-indigo-300 bg-indigo-500/10 px-3 py-1 rounded-full flex items-center border border-indigo-500/20">
                    <Icons.Clock className="w-3.5 h-3.5 mr-1.5" />
                    {formatTime(elapsedSeconds)}
                  </div>
                )}
              </h2>

              <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700/50 relative overflow-hidden group min-h-[300px]">
                
                {step === 'completed' && result ? (
                  <div className="relative w-full h-full flex flex-col justify-center bg-black">
                    <video 
                      controls 
                      className="w-full max-h-[500px] object-contain"
                      poster={result.thumbUrl}
                    >
                      <source src={result.videoUrl} type="video/mp4" />
                      您的浏览器不支持 video 标签。
                    </video>
                  </div>
                ) : (
                  <div className="text-center p-8 w-full">
                    {step === 'idle' && (
                      <div className="space-y-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600 shadow-inner">
                          <Icons.Play className="w-10 h-10 ml-1.5" />
                        </div>
                        <p className="text-slate-500 text-sm">生成的视频将在此处播放</p>
                      </div>
                    )}
                    
                    {(step === 'creating' || step === 'generating' || step === 'rendering') && (
                      <div className="space-y-8 w-full max-w-xs mx-auto">
                        <div className="relative w-24 h-24 mx-auto">
                           <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                           <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                           {step === 'rendering' ? (
                              <Icons.Loader className="absolute inset-0 m-auto w-10 h-10 text-indigo-400" />
                           ) : (
                              <Icons.Magic className="absolute inset-0 m-auto w-10 h-10 text-indigo-400 animate-pulse" />
                           )}
                        </div>
                        <div className="space-y-2">
                           <p className="text-xl font-medium text-slate-200">
                             {step === 'creating' ? '创建任务...' :
                              step === 'generating' ? '生成分镜...' : 
                              step === 'rendering' ? '渲染视频...' : '处理中...'}
                           </p>
                           <p className="text-sm text-slate-500">AI 正在努力创作中，请勿关闭页面</p>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 font-mono">
                            <span>已用时: {formatTime(elapsedSeconds)}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 'error' && (
                      <div className="space-y-4">
                        <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                          <Icons.Error className="w-10 h-10" />
                        </div>
                        <p className="text-red-400 font-medium text-lg">生成失败</p>
                        <p className="text-sm text-red-400/70 max-w-[280px] mx-auto leading-relaxed">{errorMsg}</p>
                        <p className="text-xs text-slate-500">耗时: {formatTime(elapsedSeconds)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {step === 'completed' && result && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <a 
                    href={result.videoUrl} 
                    download={`medeo_video_${result.scenarioId}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 transform hover:-translate-y-0.5 text-sm font-medium"
                  >
                    <Icons.Download className="w-4 h-4" />
                    <span>下载视频</span>
                  </a>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(result.videoUrl);
                        addLog("链接已复制到剪贴板", 'info');
                    }}
                    className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl transition-all hover:shadow-lg transform hover:-translate-y-0.5 text-sm font-medium"
                  >
                    <Icons.Copy className="w-4 h-4" />
                    <span>复制链接</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}