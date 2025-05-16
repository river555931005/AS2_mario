/**
 * UI管理器
 * 負責通用UI元素和交互
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class UIManager extends cc.Component {
    
    @property(cc.Node)
    private pauseMenu: cc.Node = null;
    
    @property(cc.Node)
    private gameOverMenu: cc.Node = null;
    
    @property(cc.Node)
    private levelClearMenu: cc.Node = null;
    
    @property(cc.Label)
    private scoreLabel: cc.Label = null;
    
    @property(cc.Label)
    private livesLabel: cc.Label = null;
    
    @property(cc.Label)
    private timeLabel: cc.Label = null;
    
    @property(cc.AudioClip)
    private buttonClickSound: cc.AudioClip = null;
    
    private isGameOver: boolean = false;
    private isLevelClear: boolean = false;
    
    // 添加 GameManager 引用，避免重複調用 cc.find
    private gameManager: any = null;
    
    onLoad() {
        // 初始化UI
        this.initUI();
        
        // 獲取 GameManager 引用
        const gameManagerNode = cc.find('GameManager');
        if (gameManagerNode) {
            this.gameManager = gameManagerNode.getComponent('GameManager');
        }
        
        // 添加遊戲管理器事件監聽
        this.addGameManagerListeners();
    }
    
    start() {
        // 更新UI
        this.updateUI();
    }
    
    // 初始化UI
    private initUI() {
        // 隱藏所有選單
        if (this.pauseMenu) {
            this.pauseMenu.active = false;
        }
        
        if (this.gameOverMenu) {
            this.gameOverMenu.active = false;
        }
        
        if (this.levelClearMenu) {
            this.levelClearMenu.active = false;
        }
    }
    
    // 添加遊戲管理器事件監聽
    private addGameManagerListeners() {
        const gameManagerNode = cc.find('GameManager');
        if (!gameManagerNode) {
            cc.warn('找不到 GameManager 節點，無法添加事件監聽');
            return;
        }
        
        // 監聽分數變化
        gameManagerNode.on('score-changed', () => {
            this.updateUI();
        });
        
        // 監聽生命值變化
        gameManagerNode.on('lives-changed', () => {
            this.updateUI();
        });
        
        // 監聽遊戲結束
        gameManagerNode.on('game-over', () => {
            this.showGameOverMenu();
        });
        
        // 監聽關卡完成
        gameManagerNode.on('level-clear', () => {
            this.showLevelClearMenu();
        });
    }
    
    // 更新UI
    private updateUI() {
        if (!this.gameManager) {
            cc.warn('找不到 GameManager 組件，無法更新 UI');
            return;
        }

        // 更新分數
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${this.gameManager.playerScore}`;
        }

        // 更新生命值
        if (this.livesLabel) {
            this.livesLabel.string = `Lives: ${this.gameManager.playerLives}`;
        }

        // 更新剩餘時間
        if (this.timeLabel) {
            this.timeLabel.string = `Time: ${this.gameManager.remainingTime}`;
        }
    }
    
    // 顯示暫停選單
    public showPauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.active = true;
        }
    }
    
    // 隱藏暫停選單
    public hidePauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.active = false;
        }
    }
    
    // 顯示遊戲結束選單
    public showGameOverMenu() {
        this.isGameOver = true;
        
        if (this.gameOverMenu) {
            this.gameOverMenu.active = true;
            
            // 動畫效果
            this.gameOverMenu.scale = 0;
            cc.tween(this.gameOverMenu)
                .to(0.5, { scale: 1 }, { easing: 'backOut' })
                .start();
        }
    }
    
    // 顯示關卡完成選單
    public showLevelClearMenu() {
        this.isLevelClear = true;
        
        if (this.levelClearMenu) {
            this.levelClearMenu.active = true;
            
            // 動畫效果
            this.levelClearMenu.opacity = 0;
            cc.tween(this.levelClearMenu)
                .to(0.5, { opacity: 255 })
                .start();
        }
    }
    
    // 返回主菜單按鈕點擊
    public onReturnToMainMenuClicked() {
        if (this.buttonClickSound) {
            cc.audioEngine.playEffect(this.buttonClickSound, false);
        }
        
        if (this.gameManager) {
            this.gameManager.returnToMainMenu();
        } else {
            cc.warn('找不到 GameManager 組件，直接加載開始場景');
            cc.director.loadScene('StartScene');
        }
    }
    
    // 重新開始按鈕點擊
    public onRestartClicked() {
        if (this.buttonClickSound) {
            cc.audioEngine.playEffect(this.buttonClickSound, false);
        }
        
        if (this.gameManager) {
            this.gameManager.restartCurrentLevel();
        } else {
            cc.warn('找不到 GameManager 組件，直接加載遊戲場景');
            cc.director.loadScene('GameView');
        }
    }
    
    // 繼續按鈕點擊
    public onResumeClicked() {
        if (this.buttonClickSound) {
            cc.audioEngine.playEffect(this.buttonClickSound, false);
        }
        
        this.hidePauseMenu();
        cc.game.resume();
    }
    
    // 下一關按鈕點擊
    public onNextLevelClicked() {
        if (this.buttonClickSound) {
            cc.audioEngine.playEffect(this.buttonClickSound, false);
        }
        
        if (this.gameManager) {
            this.gameManager.completeLevel();
        } else {
            cc.warn('找不到 GameManager 組件，直接加載關卡選擇場景');
            cc.director.loadScene('LevelSelect');
        }
    }
}