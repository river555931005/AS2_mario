/**
 * 開始場景控制器
 * 負責開始場景的UI交互和場景切換
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class StartScene extends cc.Component {
    
    @property(cc.Node)
    private titleNode: cc.Node = null;
    
    @property(cc.Button)
    private startButton: cc.Button = null;
    
    @property(cc.AudioClip)
    private bgm: cc.AudioClip = null;
    
    private audioID: number = null;
    
    onLoad() {
        // 初始化場景
        this.initScene();
    }
    
    start() {
        // 播放背景音樂
        this.playBGM();
        
        // 添加按鈕點擊事件
        this.setupButtonListeners();
        
        // 添加動畫效果
        this.addAnimations();
    }
    
    // 初始化場景
    private initScene() {
        // 初始化UI元素
        if (this.titleNode) {
            this.titleNode.scale = 0;
        }
    }
    
    // 播放背景音樂
    private playBGM() {
        if (this.bgm) {
            this.audioID = cc.audioEngine.playMusic(this.bgm, true);
        }
    }
    
    // 設置按鈕監聽器
    private setupButtonListeners() {
        if (this.startButton) {
            this.startButton.node.on('click', this.onStartButtonClicked, this);
        }
    }
    
    // 添加動畫效果
    private addAnimations() {
        // 標題動畫
        if (this.titleNode) {
            cc.tween(this.titleNode)
                .to(0.5, { scale: 1.2 })
                .to(0.2, { scale: 1.0 })
                .start();
        }
        
        // 開始按鈕動畫
        if (this.startButton) {
            cc.tween(this.startButton.node)
                .delay(0.5)
                .to(0.3, { opacity: 255, scale: 1.1 })
                .to(0.1, { scale: 1.0 })
                .start();
        }
    }
    
    // 開始按鈕點擊事件
    private onStartButtonClicked() {
        cc.audioEngine.playEffect(cc.resources.get('audio/select'), false);
        
        // 使用動畫效果過渡到下一個場景
        cc.tween(this.node)
            .to(0.5, { opacity: 0 })
            .call(() => {
                const gameManager = cc.director.getScene().getComponentInChildren('GameManager');
                if (gameManager) {
                    gameManager.startGame();
                } else {
                    cc.director.loadScene('LevelSelect');
                }
            })
            .start();
    }
    
    onDestroy() {
        // 停止背景音樂
        if (this.audioID !== null) {
            cc.audioEngine.stop(this.audioID);
        }
        
        // 移除事件監聽器
        if (this.startButton) {
            this.startButton.node.off('click', this.onStartButtonClicked, this);
        }
    }
}
