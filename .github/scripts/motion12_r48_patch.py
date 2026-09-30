from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]


def patch_assets():
    ui = ROOT / 'public/motion12/ui.js'
    s = ui.read_text()

    old = """function timerPrimaryLabel(vm){
  if(smartTimer.running)return 'Pause';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='work')return smartTimer.stopwatchElapsed>0?'Resume':'Start';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='rest')return 'Resume';
  if(vm.kind==='stopwatch')return smartTimer.stopwatchElapsed>0?'Resume':'Start';"""
    new = """function timerPrimaryLabel(vm){
  if(smartTimer.running)return 'Pause';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='ready')return 'Start';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='work')return smartTimer.stopwatchElapsed>0?'Resume':'Start';
  if(vm.kind==='strengthsets'&&smartTimer.strengthPhase==='rest')return 'Resume';
  if(vm.kind==='stopwatch')return smartTimer.stopwatchElapsed>0?'Resume':'Start';"""
    if old not in s:
        raise SystemExit('timerPrimaryLabel target not found')
    s = s.replace(old, new, 1)

    old = """      '<div class=\"timer-context\"><span>'+vm.label+'</span><b id=\"timerTopRightMeta\">'+timerTopRightMeta(vm)+'</b></div>'+\n      '<div class=\"mobile-smart-timer-controls smart-timer-controls\" id=\"mobileSmartTimerControls\" aria-label=\"Timer controls\">'+timerControls(vm)+'</div>'+\n      '<div class=\"timer-ring\" id=\"timerRing\">'+timerRingSvgMarkup(vm)+'<div><span id=\"timerPhase\" class=\"'+(String(vm.label).length>26?'long':'')+'\">'+vm.label+'</span><strong id=\"smartClock\">'+(vm.clockText||timerFormat(vm.sec))+'</strong><small id=\"timerMeta\">'+vm.meta+'</small><div class=\"timer-next\" id=\"timerNext\">'+(vm.nextText?'<span class=\"timer-next-label\">Next</span><span class=\"timer-next-stage\">'+vm.nextText+'</span>':'')+'</div></div></div>'+\n      '<div class=\"workout-timer-footer\" id=\"workoutTimerFooter\"><div class=\"smart-timer-controls\" id=\"smartTimerControls\" aria-label=\"Timer controls\">'+timerControls(vm)+'</div>'+presets+'</div>'+"""
    new = """      '<div class=\"timer-context\"><span>'+vm.label+'</span><b id=\"timerTopRightMeta\">'+timerTopRightMeta(vm)+'</b></div>'+\n      '<div class=\"timer-ring\" id=\"timerRing\">'+timerRingSvgMarkup(vm)+'<div><span id=\"timerPhase\" class=\"'+(String(vm.label).length>26?'long':'')+'\">'+vm.label+'</span><strong id=\"smartClock\">'+(vm.clockText||timerFormat(vm.sec))+'</strong><small id=\"timerMeta\">'+vm.meta+'</small><div class=\"timer-next\" id=\"timerNext\">'+(vm.nextText?'<span class=\"timer-next-label\">Next</span><span class=\"timer-next-stage\">'+vm.nextText+'</span>':'')+'</div></div></div>'+\n      '<div class=\"mobile-smart-timer-controls smart-timer-controls\" id=\"mobileSmartTimerControls\" aria-label=\"Timer controls\">'+timerControls(vm)+'</div>'+\n      '<div class=\"workout-timer-footer\" id=\"workoutTimerFooter\"><div class=\"smart-timer-controls\" id=\"smartTimerControls\" aria-label=\"Timer controls\">'+timerControls(vm)+'</div>'+presets+'</div>'+"""
    if old not in s:
        raise SystemExit('renderTimerPage target not found')
    s = s.replace(old, new, 1)
    ui.write_text(s)

    css = ROOT / 'public/motion12/app.css'
    c = css.read_text()
    if 'timer-controls-r48' not in c:
        c += """

/* ---- timer-controls-r48 ---- */
/* Phone timer contract: dial first; one action group directly beneath it. */
@media(max-width:480px){
  #dayPage .workout-primary-timer .mobile-smart-timer-controls,
  #dayPage.compact-active .workout-primary-timer .mobile-smart-timer-controls{
    margin:12px 0 0 !important;
  }
  #dayPage .workout-primary-timer .workout-timer-footer .smart-timer-controls,
  #dayPage.compact-active .workout-primary-timer .workout-timer-footer .smart-timer-controls{
    display:none !important;
  }
}
"""
    css.write_text(c)


def patch_shell(asset_sha):
    old_sha = '532b791d7b6398d0be70633cef3fa59fcd5fdb90'
    p = ROOT / 'public/motion12/index.html'
    s = p.read_text()
    if old_sha not in s:
        raise SystemExit('r47 asset pin not found in index')
    p.write_text(s.replace(old_sha, asset_sha).replace('canonical-r47-20260930', 'canonical-r48-20260930'))

    sw = ROOT / 'public/motion12/service-worker.js'
    s = sw.read_text()
    s = s.replace('canonical-r47-20260930', 'canonical-r48-20260930').replace('retired-r47', 'retired-r48').replace('MOTION12 r47', 'MOTION12 r48')
    sw.write_text(s)

    up = ROOT / 'public/motion12-update.html'
    up.write_text(up.read_text().replace('canonical-r47-20260930', 'canonical-r48-20260930'))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('usage: motion12_r48_patch.py assets | shell <asset_sha>')
    if sys.argv[1] == 'assets':
        patch_assets()
    elif sys.argv[1] == 'shell' and len(sys.argv) == 3:
        patch_shell(sys.argv[2])
    else:
        raise SystemExit('invalid arguments')
