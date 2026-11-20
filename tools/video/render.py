import subprocess, os
from playwright.sync_api import sync_playwright
FPS=30; out='/home/claude/test/seedpoker.mp4'; tmp=out+'.part.mp4'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome'); pg=b.new_page(viewport={'width':1280,'height':720})
    pg.goto('http://localhost:8770/vid/sp.html'); pg.wait_for_function('window.ready'); pg.wait_for_timeout(800)
    dur=pg.evaluate('DUR'); n=int(dur*FPS)
    ff=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart','-f','mp4',tmp],stdin=subprocess.PIPE)
    for i in range(n):
        pg.evaluate(f'renderAt({i/FPS})'); ff.stdin.write(pg.screenshot(type='jpeg',quality=92))
    ff.stdin.close(); rc=ff.wait()
if rc==0: os.replace(tmp,out); print('ok',n)
