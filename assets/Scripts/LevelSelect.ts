/**
 * 關卡選擇場景控制器
 * 負責關卡選擇的UI交互和場景切換
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class LevelSelect extends cc.Component {
    
    @property(cc.Node)
    private worldTitle: cc.Node = null;
    
    @property([cc.Button])
    private levelButtons: cc.Button[] = [];
    
    @property(cc.Button)
    private backButton: cc.Button = null;
    
    @property(cc.AudioClip)
    private bgm: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private selectSound: cc.AudioClip = null;
    
    private audioID: number = null;
    private currentWorld: number = 1;
    private gameManager: any = null;
    
    onLoad() {
        // 獲取遊戲管理器引用
        this.gameManager = cc.find('GameManager')?.getComponent('GameManager');
        if (this.gameManager) {
            this.currentWorld = this.gameManager.currentWorld;
        } else {
            cc.warn('找不到 GameManager，關卡選擇可能無法正常工作');
        }
        
        // 初始化UI
        this.initUI();
    }
    
    start() {
        // 播放背景音樂
        if (this.bgm) {
            this.audioID = cc.audioEngine.playMusic(this.bgm, true);
        }
        
        // 設置按鈕事件
        this.setupButtonListeners();
        
        // 添加動畫效果
        this.addAnimations();
    }
    
    // 初始化UI
    private initUI() {
        if (this.worldTitle) {
            this.worldTitle.getComponent(cc.Label).string = `World ${this.currentWorld}`;
        }
        
        // 設置關卡按鈕初始透明度為0，為動畫做準備
        for (let i = 0; i < this.levelButtons.length; i++) {
            this.levelButtons[i].node.opacity = 0;
        }
    }
    
    // 設置按鈕事件
    private setupButtonListeners() {
        // 設置關卡按鈕
        for (let i = 0; i < this.levelButtons.length; i++) {
            const levelNum = i + 1;
            const levelButton = this.levelButtons[i];
            const onClickHandler = () => { this.onLevelButtonClicked(levelNum); };
            
            // 儲存處理函數以便後續移除事件
            levelButton.node['clickHandler'] = onClickHandler;
            levelButton.node.on('click', onClickHandler, this);
        }
        
        // 設置返回按鈕
        if (this.backButton) {
            this.backButton.node.on('click', this.onBackButtonClicked, this);
        }
    }
    
    // 添加動畫效果
    private addAnimations() {
        // 標題動畫
        if (this.worldTitle) {
            cc.tween(this.worldTitle)
                .to(0.5, { scale: 1.2 })
                .to(0.2, { scale: 1.0 })
                .start();
        }
        
        // 關卡按鈕動畫
        for (let i = 0; i < this.levelButtons.length; i++) {
            cc.tween(this.levelButtons[i].node)
                .delay(0.2 * (i + 1))
                .to(0.2, { scale: 1.1, opacity: 255 })
                .to(0.1, { scale: 1.0 })
                .start();
        }
    }
    
    // 關卡按鈕點擊事件
    private onLevelButtonClicked(level: number) {
        if (this.selectSound) {
            cc.audioEngine.playEffect(this.selectSound, false);
        }
        
        // 使用動畫效果過渡到遊戲場景
        cc.tween(this.node)
            .to(0.5, { opacity: 0 })
            .call(() => {
                if (this.gameManager) {
                    // 統一使用 GameManager 處理關卡載入
                    this.gameManager.startLevel(this.currentWorld, level);
                } else {
                    cc.warn('找不到 GameManager，直接載入遊戲場景');
                    cc.director.loadScene('GameView');
                }
            })
            .start();
    }
    
    // 返回按鈕點擊事件
    private onBackButtonClicked() {
        if (this.selectSound) {
            cc.audioEngine.playEffect(this.selectSound, false);
        }
        
        // 返回主菜單
        cc.tween(this.node)
            .to(0.5, { opacity: 0 })
            .call(() => {
                if (this.gameManager) {
                    // 使用 GameManager 返回主菜單
                    this.gameManager.returnToMainMenu();
                } else {
                    cc.warn('找不到 GameManager，直接載入開始場景');
                    cc.director.loadScene('StartScene');
                }
            })
            .start();
    }
    
    onDestroy() {
        // 停止背景音樂
        if (this.audioID !== null) {
            cc.audioEngine.stop(this.audioID);
        }
        
        // 移除事件監聽，使用更一致的方式
        for (const button of this.levelButtons) {
            if (button.node['clickHandler']) {
                button.node.off('click', button.node['clickHandler'], this);
            }
        }
        
        if (this.backButton) {
            this.backButton.node.off('click', this.onBackButtonClicked, this);
        }
    }
}
