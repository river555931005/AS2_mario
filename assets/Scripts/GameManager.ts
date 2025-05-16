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
    
    // 單例模式獲取實例
    public static getInstance(): GameManager {
        return GameManager.instance;
    }
    
    onLoad() {
        // 設置單例
        if (GameManager.instance === null) {
            GameManager.instance = this;
            cc.game.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
            return;
        }
        
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
    }
    
    // 減少生命
    public loseLife() {
        this.playerLives--;
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
        // 遊戲結束邏輯
        this.scheduleOnce(() => {
            cc.director.loadScene('StartScene');
        }, 2);
    }
    
    // 完成關卡
    public completeLevel() {
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
    }
    
    private playBackgroundMusic() {
        const bgm = cc.find('Audio/bgm_1.mp3');
        if (bgm) {
            cc.audioEngine.playMusic(bgm.getComponent(cc.AudioSource).clip, true);
        }
    }

    update(dt) {
        // 每秒減少剩餘時間
    }
}
