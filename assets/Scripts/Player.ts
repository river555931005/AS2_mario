/**
 * 玩家控制器
 * 負責玩家角色的行為、動畫和物理碰撞
 */

const {ccclass, property} = cc._decorator;

// 將 PlayerState 定義移到類外部
export enum PlayerState {
    SMALL,
    BIG,
    FIRE,
    INVINCIBLE
}

@ccclass
export default class Player extends cc.Component {
    
    @property(cc.Float)
    public moveSpeed: number = 200;
    
    @property(cc.Float)
    public maxMoveSpeed: number = 400;
    
    @property(cc.Float)
    public jumpForce: number = 600;
    
    @property(cc.Float)
    public gravity: number = -1000;
    
    // 音效
    @property(cc.AudioClip)
    private jumpSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private dieSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private powerUpSound: cc.AudioClip = null;
    
    @property(cc.AudioClip)
    private powerDownSound: cc.AudioClip = null;
    
    // 檢測器
    @property(cc.Node)
    private groundCheck: cc.Node = null;
    
    // 動畫相關
    @property(cc.Animation)
    private anim: cc.Animation = null;
    
    // 動畫幀資源
    @property({
        type: [cc.SpriteFrame],
        tooltip: '小馬里奧閒置動畫幀'
    })
    private smallIdleFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '小馬里奧跑步動畫幀'
    })
    private smallRunFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '小馬里奧跳躍動畫幀'
    })
    private smallJumpFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '大馬里奧閒置動畫幀'
    })
    private bigIdleFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '大馬里奧跑步動畫幀'
    })
    private bigRunFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '大馬里奧跳躍動畫幀'
    })
    private bigJumpFrames: cc.SpriteFrame[] = [];
    
    @property({
        type: [cc.SpriteFrame],
        tooltip: '死亡動畫幀'
    })
    private dieFrames: cc.SpriteFrame[] = [];
    
    // 私有屬性
    private rigidBody: cc.RigidBody = null;
    private currentState: PlayerState = PlayerState.SMALL;
    private isGrounded: boolean = false;
    private isDead: boolean = false;
    private isJumping: boolean = false;
    private isInvincible: boolean = false;
    private invincibleTime: number = 0;
    private velocity: cc.Vec2 = cc.v2(0, 0);
    private direction: number = 1; // 1=右，-1=左
    
    onLoad() {
        // 獲取組件
        this.rigidBody = this.getComponent(cc.RigidBody);
        if (!this.rigidBody) {
            this.rigidBody = this.addComponent(cc.RigidBody);
            this.rigidBody.type = cc.RigidBodyType.Dynamic;
            this.rigidBody.allowSleep = false;
            this.rigidBody.gravityScale = 1;
            this.rigidBody.linearDamping = 0;
            this.rigidBody.fixedRotation = true;
        }
        
        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
        }
        collider.size = cc.size(32, 32);
        collider.offset = cc.v2(0, 0);
        collider.sensor = false;
        
        // 設置分組
        this.node.group = 'player';
        
        // 確保 groundCheck 存在並位於正確的位置
        if (!this.groundCheck) {
            this.groundCheck = new cc.Node('GroundCheck');
            this.groundCheck.parent = this.node;
            this.groundCheck.setPosition(0, -this.node.height / 2 - 1);
        }
        
        // 初始化動畫
        this.initAnimations();
        
        // 註冊鍵盤事件
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
    
    start() {
        // 設置初始狀態
        this.setState(PlayerState.SMALL);
    }
    
    update(dt) {
        // 處理無敵狀態
        if (this.isInvincible) {
            this.invincibleTime -= dt;
            if (this.invincibleTime <= 0) {
                this.isInvincible = false;
                this.node.opacity = 255;
            } else {
                // 閃爍效果
                this.node.opacity = (Math.floor(this.invincibleTime * 10) % 2 === 0) ? 255 : 128;
            }
        }
        
        // 死亡檢查
        if (this.isDead) {
            return;
        }
        
        // 地面檢查
        this.checkGround();
        
        // 更新移動
        this.updateMovement(dt);
        
        // 更新動畫
        this.updateAnimation();
        
        // 邊界檢查
        this.checkBounds();
    }
    
    // 修正動畫初始化方法
    private initAnimations() {
        if (!this.anim) {
            this.anim = this.node.getComponent(cc.Animation);
            if (!this.anim) {
                this.anim = this.node.addComponent(cc.Animation);
            }
        }
        
        // 清空現有動畫剪輯以避免重複
        this.anim.getClips().forEach(clip => {
            this.anim.removeClip(clip, true);
        });
        
        // 為每個狀態創建動畫剪輯，並設置精靈幀
        this.createAnimationClip('small_idle', this.smallIdleFrames, 0.1, cc.WrapMode.Loop);
        this.createAnimationClip('small_run', this.smallRunFrames, 0.1, cc.WrapMode.Loop);
        this.createAnimationClip('small_jump', this.smallJumpFrames, 0.1, cc.WrapMode.Normal);
        
        this.createAnimationClip('big_idle', this.bigIdleFrames, 0.1, cc.WrapMode.Loop);
        this.createAnimationClip('big_run', this.bigRunFrames, 0.1, cc.WrapMode.Loop);
        this.createAnimationClip('big_jump', this.bigJumpFrames, 0.1, cc.WrapMode.Normal);
        
        this.createAnimationClip('die', this.dieFrames, 0.1, cc.WrapMode.Normal);
        
        // 如果沒有提供足夠的精靈幀，發出警告
        if (this.smallIdleFrames.length === 0 || this.smallRunFrames.length === 0 ||
            this.smallJumpFrames.length === 0 || this.bigIdleFrames.length === 0 ||
            this.bigRunFrames.length === 0 || this.bigJumpFrames.length === 0 ||
            this.dieFrames.length === 0) {
            cc.warn('玩家動畫幀不足，請在編輯器中添加相應的精靈幀');
        }
    }
    
    // 創建動畫剪輯並設置精靈幀
    private createAnimationClip(name: string, frames: cc.SpriteFrame[], sample: number, wrapMode: cc.WrapMode) {
        if (!frames || frames.length === 0) {
            cc.warn(`無法創建動畫 ${name}：沒有提供精靈幀`);
            return;
        }

        const clip = new cc.AnimationClip();
        clip.name = name;
        clip.wrapMode = wrapMode;
        clip.sample = sample === 0 ? 60 : 1 / sample;
        clip.duration = frames.length * sample;

        // 設置精靈幀關鍵幀
        // Cocos Creator 2.x 使用 'frames' 屬性來設置精靈動畫
        (clip as any).frames = [];
        for (let i = 0; i < frames.length; i++) {
            (clip as any).frames.push({
                frame: i * sample,
                value: frames[i]
            });
        }
        // 設置動畫屬性曲線
        clip.curveData = {
            comps: {
                "cc.Sprite": {
                    "spriteFrame": (clip as any).frames
                }
            }
        };

        // 添加到動畫組件
        this.anim.addClip(clip);
    }
    
    public setState(state: PlayerState) {
        const prevState = this.currentState;
        this.currentState = state;

        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) return;

        switch (state) {
            case PlayerState.SMALL:
                if (prevState === PlayerState.BIG || prevState === PlayerState.FIRE) {
                    if (this.powerDownSound) {
                        cc.audioEngine.playEffect(this.powerDownSound, false);
                    }
                }
                collider.size = cc.size(32, 32);
                collider.offset = cc.v2(0, 0);
                this.node.height = 32;
                break;

            case PlayerState.BIG:
            case PlayerState.FIRE:
                if (prevState === PlayerState.SMALL) {
                    if (this.powerUpSound) {
                        cc.audioEngine.playEffect(this.powerUpSound, false);
                    }
                }
                collider.size = cc.size(32, 64);
                collider.offset = cc.v2(0, 16);
                this.node.height = 64;
                break;

            case PlayerState.INVINCIBLE:
                if (this.powerUpSound) {
                    cc.audioEngine.playEffect(this.powerUpSound, false);
                }
                this.isInvincible = true;
                this.invincibleTime = 10; // 10秒無敵時間
                break;
        }

        this.updateAnimation();
    }
    
    // 地面檢查
    private checkGround() {
        if (!this.groundCheck) return;
        
        // 使用射線檢測地面，從 groundCheck 節點向下發射
        const physicsManager = cc.director.getPhysicsManager();
        const start = this.groundCheck.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const end = start.add(cc.v2(0, -5)); // 向下射線長度
        
        const results = physicsManager.rayCast(start, end, cc.RayCastType.All);
        
        // 過濾掉自己的碰撞體
        const filteredResults = results.filter(result => 
            result.collider.node !== this.node && 
            result.collider.node.group !== 'player'
        );
        
        // 判定是否接觸地面
        this.isGrounded = filteredResults.length > 0;
        
        // 著地時重置跳躍狀態
        if (this.isGrounded && this.velocity.y <= 0) {
            this.isJumping = false;
        }
        
        // 調試可視化（可根據需要手動開啟或關閉）
        // 例如：在編輯器中設置一個開關，或在此處直接設置
        // cc.director.getPhysicsManager().debugDrawFlags = 
        //     cc.PhysicsManager.DrawBits.e_aabbBit |
        //     cc.PhysicsManager.DrawBits.e_jointBit |
        //     cc.PhysicsManager.DrawBits.e_shapeBit;
    }
    
    // 更新移動
    private updateMovement(dt) {
        // 應用重力
        this.velocity.y += this.gravity * dt;
        
        // 限制最大速度
        if (this.velocity.x > this.maxMoveSpeed) {
            this.velocity.x = this.maxMoveSpeed;
        } else if (this.velocity.x < -this.maxMoveSpeed) {
            this.velocity.x = -this.maxMoveSpeed;
        }
        
        // 應用速度到剛體
        if (this.rigidBody) {
            this.rigidBody.linearVelocity = this.velocity;
        }
    }
    
    // 更新動畫
    private updateAnimation() {
        if (this.isDead) {
            this.anim.play('die');
            return;
        }
        
        const animPrefix = this.currentState === PlayerState.SMALL ? 'small_' : 'big_';
        
        if (!this.isGrounded) {
            this.anim.play(animPrefix + 'jump');
        } else if (Math.abs(this.velocity.x) > 10) {
            this.anim.play(animPrefix + 'run');
        } else {
            this.anim.play(animPrefix + 'idle');
        }
        
        // 更新朝向
        if (this.velocity.x > 0) {
            this.node.scaleX = 1;
            this.direction = 1;
        } else if (this.velocity.x < 0) {
            this.node.scaleX = -1;
            this.direction = -1;
        }
    }
    
    // 邊界檢查
    private checkBounds() {
        const gameView = cc.find('Canvas');
        if (!gameView) return;
        
        // 檢查是否掉出螢幕底部
        if (this.node.y < -gameView.height / 2 - 100) {
            this.die();
        }
    }
    
    // 鍵盤按下事件
    private onKeyDown(event) {
        if (this.isDead) return;
        
        switch(event.keyCode) {
            case cc.macro.KEY.left:
            case cc.macro.KEY.a:
                this.velocity.x = -this.moveSpeed;
                break;
                
            case cc.macro.KEY.right:
            case cc.macro.KEY.d:
                this.velocity.x = this.moveSpeed;
                break;
                
            case cc.macro.KEY.space:
            case cc.macro.KEY.w:
            case cc.macro.KEY.up:
                this.jump();
                break;
        }
    }
    
    // 鍵盤釋放事件
    private onKeyUp(event) {
        switch(event.keyCode) {
            case cc.macro.KEY.left:
            case cc.macro.KEY.a:
                if (this.velocity.x < 0) {
                    this.velocity.x = 0;
                }
                break;
                
            case cc.macro.KEY.right:
            case cc.macro.KEY.d:
                if (this.velocity.x > 0) {
                    this.velocity.x = 0;
                }
                break;
        }
    }
    
    // 跳躍
    private jump() {
        if (this.isGrounded && !this.isJumping) {
            this.velocity.y = this.jumpForce;
            this.isJumping = true;
            this.isGrounded = false;
            
            // 播放跳躍音效
            if (this.jumpSound) {
                cc.audioEngine.playEffect(this.jumpSound, false);
            }
        }
    }
    
    // 碰撞開始
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        // 防止死亡後再處理碰撞
        if (this.isDead) return;
        
        const otherNode = otherCollider.node;
        
        // 獲取碰撞點的世界坐標和法線
        const worldManifold = contact.getWorldManifold();
        const points = worldManifold.points;
        const normal = worldManifold.normal;
        
        // 碰到敵人
        if (otherNode.group === 'enemy') {
            const playerBottom = this.node.y - this.node.height / 2;
            const enemyTop = otherNode.y + otherNode.height / 2;
            
            // 檢查碰撞法線是否向上，這通常意味著玩家從上方踩到敵人
            if (normal.y > 0.7 && this.velocity.y < 0) {
                // 踩到敵人頭部
                const enemy = otherNode.getComponent('Enemy');
                if (enemy) {
                    enemy.die();
                    // 踩敵人後反彈
                    this.velocity.y = this.jumpForce * 0.7;
                    
                    if (this.jumpSound) {
                        cc.audioEngine.playEffect(this.jumpSound, false);
                    }
                }
            } else {
                // 碰到敵人其他部分
                this.hurt();
            }
        }
        
        // 碰到問號方塊
        else if (otherNode.group === 'questionBlock') {
            // 檢查碰撞法線是否向下，表示從下方撞擊方塊
            if (normal.y < -0.7) {
                const block = otherNode.getComponent('QuestionBlock');
                if (block) {
                    block.hit();
                }
            }
        }
        
        // 碰到物品
        else if (otherNode.group === 'item') {
            const item = otherNode.getComponent('Item');
            if (item) {
                item.collect(this);
            }
        }
    }
    
    // 受傷
    public hurt() {
        if (this.isInvincible) return;
        
        if (this.currentState === PlayerState.SMALL) {
            // 小馬里奧直接死亡
            this.die();
        } else {
            // 大馬里奧變小
            this.setState(PlayerState.SMALL);
            
            // 短暫無敵
            this.isInvincible = true;
            this.invincibleTime = 3;
        }
    }
    
    // 死亡
    public die() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // 停用物理模擬，但保留組件
        if (this.rigidBody) {
            this.rigidBody.active = false;
        }
        
        // 播放死亡音效
        if (this.dieSound) {
            cc.audioEngine.playEffect(this.dieSound, false);
        }
        
        // 播放死亡動畫
        if (this.anim) {
            this.anim.play('die');
        }
        
        // 向上彈跳的死亡動畫
        cc.tween(this.node)
            .by(0.5, { y: 100 })
            .by(1, { y: -500 })
            .call(() => {
                // 通知遊戲管理器
                const gameManager = cc.find('GameManager').getComponent('GameManager');
                if (gameManager) {
                    gameManager.loseLife();
                }
            })
            .start();
    }
    
    // 增大
    public growBig() {
        if (this.currentState === PlayerState.SMALL) {
            this.setState(PlayerState.BIG);
        }
    }

    // 清理，移除事件監聽器
    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
}
