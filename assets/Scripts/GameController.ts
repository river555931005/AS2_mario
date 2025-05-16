/**
 * 遊戲控制器
 * 負責遊戲場景的管理和UI顯示
 */

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    
    // 預設資源
    @property(cc.Prefab)
    private playerPrefab: cc.Prefab = null;
    
    @property([cc.Prefab])
    private enemyPrefabs: cc.Prefab[] = [];
    
    @property(cc.Prefab)
    private blockPrefab: cc.Prefab = null;
    
    @property(cc.Prefab)
    private mushRoomPrefab: cc.Prefab = null;
    
    @property(cc.TiledMap)
    private tiledMap: cc.TiledMap = null;
    
    // 移除 UI 元素屬性，由 UIManager 專門處理
    
    // 音效
    @property(cc.AudioClip)
    private bgm: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private levelClearSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private gameOverSound: cc.AudioClip = null;
    
    // 相機控制器
    @property(cc.Prefab)
    private cameraControllerPrefab: cc.Prefab = null;
    
    // 私有屬性
    private player: cc.Node = null;
    private isPaused: boolean = false;
    private isGameOver: boolean = false;
    private isLevelClear: boolean = false;
    private audioID: number = null;
    private timeCounter: number = 0;
    private playerSpawnPoint: cc.Vec2 = cc.v2(0, 0);
    private gameManager: any = null;
    private uiManager: any = null;
    
    onLoad() {
        // 獲取遊戲管理器和UI管理器
        this.gameManager = cc.find('GameManager')?.getComponent('GameManager');
        this.uiManager = cc.find('Canvas/UIManager')?.getComponent('UIManager');
        
        if (!this.gameManager) {
            cc.warn('找不到 GameManager，遊戲可能無法正常運行');
        }
        
        if (!this.uiManager) {
            cc.warn('找不到 UIManager，UI 可能無法正常顯示');
        }
        
        // 初始化物理引擎
        this.initPhysics();
        
        // 創建遊戲場景
        this.createGameScene();
        
        // 註冊鍵盤事件
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        
        // 註冊物理碰撞檢測
        cc.director.getPhysicsManager().on('begin-contact', this.onBeginContact, this);
    }
    
    start() {
        // 播放背景音樂
        if (this.bgm) {
            this.audioID = cc.audioEngine.playMusic(this.bgm, true);
        }
        
        // 啟動計時器，通過 GameManager 管理時間
        this.schedule(this.updateTimer, 1);
    }
    
    update(dt) {
        if (this.isPaused || this.isGameOver || this.isLevelClear) {
            return;
        }
        
        // 檢查關卡結束條件
        this.checkLevelClear();
    }
    
    // 初始化物理引擎
    private initPhysics() {
        const physicsManager = cc.director.getPhysicsManager();
        physicsManager.enabled = true;
        physicsManager.gravity = cc.v2(0, -800);
        
        // 開啟碰撞偵測
        const collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true;
    }
    
    // 創建遊戲場景
    private createGameScene() {
        // 設置初始遊戲參數
        if (this.gameManager) {
            this.gameManager.remainingTime = 300;
        }
        
        // 創建地圖生成器
        const mapGeneratorNode = new cc.Node('MapGenerator');
        const mapGenerator = mapGeneratorNode.addComponent('MapGenerator');
        this.node.addChild(mapGeneratorNode);
        
        // 創建玩家
        this.createPlayer();
        
        // 創建相機控制器
        this.createCameraController();
    }
    
    // 創建玩家
    private createPlayer() {
        if (this.playerPrefab) {
            this.player = cc.instantiate(this.playerPrefab);
            this.player.group = 'player';
            
            // 默認生成點為初始位置
            this.playerSpawnPoint = cc.v2(0, 100);
            this.player.setPosition(this.playerSpawnPoint);
            
            this.node.addChild(this.player);
        }
    }
    
    // 創建相機控制器
    private createCameraController() {
        if (this.cameraControllerPrefab && this.player) {
            const cameraController = cc.instantiate(this.cameraControllerPrefab);
            this.node.addChild(cameraController);
            
            // 設置相機跟隨目標為玩家
            const controller = cameraController.getComponent('CameraController');
            if (controller) {
                controller.target = this.player;
            }
        } else {
            // 如果沒有提供相機控制器，創建一個簡單的相機
            const cameraNode = new cc.Node('GameCamera');
            const camera = cameraNode.addComponent(cc.Camera);
            camera.cullingMask = 0xffffffff;
            
            this.node.addChild(cameraNode);
            
            // 將相機定位在玩家上方
            if (this.player) {
                cameraNode.setPosition(this.player.getPosition());
                
                // 添加一個簡單的跟隨腳本
                const followScript = cameraNode.addComponent('CameraFollow');
                if (followScript) {
                    followScript.target = this.player;
                }
            }
        }
    }
    
    // 創建終點旗幟
    private createEndFlag(pos: cc.Vec2) {
        const flag = new cc.Node("end_flag");
        flag.group = "endFlag";
        flag.setPosition(pos);
        
        // 添加旗幟碰撞組件
        const flagBody = flag.addComponent(cc.RigidBody);
        flagBody.type = cc.RigidBodyType.Static;
        
        const flagPhysicsCollider = flag.addComponent(cc.PhysicsBoxCollider);
        flagPhysicsCollider.size = cc.size(10, 200);
        flagPhysicsCollider.offset = cc.v2(0, 100);
        flagPhysicsCollider.sensor = true;
        
        // 不再使用觸摸事件，改為使用物理碰撞檢測
        
        this.node.addChild(flag);
    }
    
    // 物理碰撞檢測
    private onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        // 檢查是否是玩家與旗幟的碰撞
        if ((selfCollider.node.group === 'endFlag' && otherCollider.node.group === 'player') || 
            (selfCollider.node.group === 'player' && otherCollider.node.group === 'endFlag')) {
            this.onFlagReached();
        }
    }
    
    // 更新計時器
    private updateTimer() {
        if (this.isPaused || this.isGameOver || this.isLevelClear) {
            return;
        }
        
        if (this.gameManager) {
            // 使用 GameManager 管理時間
            this.gameManager.updateTime();
            
            // 檢查時間是否用盡
            if (this.gameManager.remainingTime <= 0) {
                this.gameOver();
            }
        }
    }
    
    // 鍵盤按下事件
    private onKeyDown(event) {
        switch(event.keyCode) {
            case cc.macro.KEY.escape:
            case cc.macro.KEY.p:
                this.togglePause();
                break;
        }
    }
    
    // 切換暫停狀態
    private togglePause() {
        this.isPaused = !this.isPaused;
        
        // 使用 UIManager 顯示/隱藏暫停選單
        if (this.uiManager) {
            if (this.isPaused) {
                this.uiManager.showPauseMenu();
            } else {
                this.uiManager.hidePauseMenu();
            }
        }
        
        if (this.isPaused) {
            cc.game.pause();
        } else {
            cc.game.resume();
        }
    }
    
    // 檢查關卡結束
    private checkLevelClear() {
        // 這裡可以添加更多的結束條件
    }
    
    // 到達終點旗幟
    private onFlagReached() {
        if (this.isLevelClear || this.isGameOver) {
            return;
        }
        
        this.isLevelClear = true;
        
        // 播放關卡通關音效
        if (this.levelClearSound) {
            cc.audioEngine.playEffect(this.levelClearSound, false);
        }
        
        // 停止背景音樂
        cc.audioEngine.stopMusic();
        
        // 通知 UIManager 顯示關卡完成選單
        if (this.uiManager) {
            this.uiManager.showLevelClearMenu();
        }
        
        // 向玩家添加時間獎勵分數
        if (this.gameManager) {
            this.gameManager.addScore(this.gameManager.remainingTime * 10);
            this.gameManager.completeLevel();
        }
    }
    
    // 遊戲結束
    private gameOver() {
        this.isGameOver = true;
        
        // 播放遊戲結束音效
        if (this.gameOverSound) {
            cc.audioEngine.playEffect(this.gameOverSound, false);
        }
        
        // 停止背景音樂
        cc.audioEngine.stopMusic();
        
        // 通知 UIManager 顯示遊戲結束選單
        if (this.uiManager) {
            this.uiManager.showGameOverMenu();
        }
        
        // 通知遊戲管理器
        if (this.gameManager) {
            this.gameManager.gameOver();
        }
    }
    
    // 獲取玩家節點
    public getPlayerNode(): cc.Node {
        return this.player;
    }
    
    onDestroy() {
        // 取消事件監聽
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.director.getPhysicsManager().off('begin-contact', this.onBeginContact, this);
        
        // 停止計時器
        this.unschedule(this.updateTimer);
        
        // 停止音樂
        cc.audioEngine.stopMusic();
    }
}
