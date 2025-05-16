/**
 * 遊戲管理器
 * 負責管理遊戲流程、場景切換和全局遊戲資料
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameManager extends cc.Component {
    
    private static instance: GameManager = null;
    
    // 玩家生命值
    @property(cc.Integer)
    public playerLives: number = 3;
    
    // 玩家得分
    @property(cc.Integer)
    public playerScore: number = 0;
    
    // 剩餘時間
    @property(cc.Integer)
    public remainingTime: number = 300;
    
    // 當前世界
    @property(cc.Integer)
    public currentWorld: number = 1;
    
    // 當前關卡
    @property(cc.Integer)
    public currentLevel: number = 1;
    
    // 背景音樂
    @property({
        type: cc.AudioClip,
        tooltip: '背景音樂'
    })
    private backgroundMusic: cc.AudioClip = null;
    
    // 時間管理
    private timeElapsed: number = 0;
    
    // 單例模式獲取實例
    public static getInstance(): GameManager {
        return GameManager.instance;
    }
    
    onLoad() {
        // 改進單例模式的處理
        if (GameManager.instance !== null) {
            cc.warn('發現多個 GameManager 實例，銷毀重複的實例');
            this.node.destroy();
            return;
        }
        
        // 設置單例
        GameManager.instance = this;
        cc.game.addPersistRootNode(this.node);
        
        // 初始化遊戲數據
        this.initGameData();
    }
    
    start() {
        this.playBackgroundMusic();
    }
    
    // 初始化遊戲數據
    private initGameData() {
        this.playerLives = 3;
        this.playerScore = 0;
        this.remainingTime = 300;
        this.currentWorld = 1;
        this.currentLevel = 1;
    }
    
    // 加分
    public addScore(score: number) {
        this.playerScore += score;
        this.node.emit('score-changed'); // 發送分數變化事件
    }
    
    // 減少生命
    public loseLife() {
        this.playerLives--;
        this.node.emit('lives-changed'); // 發送生命值變化事件
        
        if (this.playerLives <= 0) {
            this.gameOver();
        } else {
            // 重新開始當前關卡
            this.restartCurrentLevel();
        }
    }
    
    // 增加生命
    public addLife() {
        this.playerLives++;
        this.node.emit('lives-changed'); // 發送生命值變化事件
    }
    
    // 開始遊戲
    public startGame() {
        cc.director.loadScene('LevelSelect');
    }
    
    // 開始指定關卡
    public startLevel(world: number, level: number) {
        this.currentWorld = world;
        this.currentLevel = level;
        cc.director.loadScene('GameView');
    }
    
    // 重新開始當前關卡
    public restartCurrentLevel() {
        cc.director.loadScene('GameView');
    }
    
    // 返回主菜單
    public returnToMainMenu() {
        cc.director.loadScene('StartScene');
    }
    
    // 返回關卡選擇
    public returnToLevelSelect() {
        cc.director.loadScene('LevelSelect');
    }
    
    // 遊戲結束
    public gameOver() {
        // 發送遊戲結束事件
        this.node.emit('game-over');
        
        // 遊戲結束邏輯
        this.scheduleOnce(() => {
            cc.director.loadScene('StartScene');
        }, 2);
    }
    
    // 完成關卡
    public completeLevel() {
        // 發送關卡完成事件
        this.node.emit('level-clear');
        
        // 關卡完成邏輯
        this.currentLevel++;
        if (this.currentLevel > 4) {
            this.currentLevel = 1;
            this.currentWorld++;
        }
        
        // 延遲加載下一關
        this.scheduleOnce(() => {
            cc.director.loadScene('LevelSelect');
        }, 2);
    }
    
    // 更新剩餘時間
    public updateTime() {
        if (this.remainingTime <= 0) {
            this.loseLife();
            return;
        }
        this.remainingTime--;
        this.node.emit('time-changed'); // 發送時間變化事件
    }
    
    // 改進背景音樂播放
    private playBackgroundMusic() {
        if (this.backgroundMusic) {
            cc.audioEngine.playMusic(this.backgroundMusic, true);
        } else {
            cc.warn('背景音樂未設置！');
        }
    }

    // 實現時間管理
    update(dt) {
        // 每秒減少剩餘時間
        this.timeElapsed += dt;
        if (this.timeElapsed >= 1) {
            this.updateTime();
            this.timeElapsed = 0; // 重置計時器
        }
    }
}
