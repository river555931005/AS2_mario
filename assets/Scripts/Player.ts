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
    
    // 修正屬性定義
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
        
        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
        }
        collider.size = cc.size(32, 32);
        collider.offset = cc.v2(0, 0);
        collider.sensor = false;
        
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
        const smallIdle = new cc.AnimationClip();
        smallIdle.name = 'small_idle';
        smallIdle.wrapMode = cc.WrapMode.Loop;
        smallIdle.duration = 0.1;

        const smallRun = new cc.AnimationClip();
        smallRun.name = 'small_run';
        smallRun.wrapMode = cc.WrapMode.Loop;
        smallRun.duration = 0.4;

        const smallJump = new cc.AnimationClip();
        smallJump.name = 'small_jump';
        smallJump.wrapMode = cc.WrapMode.Normal;
        smallJump.duration = 0.1;

        const bigIdle = new cc.AnimationClip();
        bigIdle.name = 'big_idle';
        bigIdle.wrapMode = cc.WrapMode.Loop;
        bigIdle.duration = 0.1;

        const bigRun = new cc.AnimationClip();
        bigRun.name = 'big_run';
        bigRun.wrapMode = cc.WrapMode.Loop;
        bigRun.duration = 0.4;

        const bigJump = new cc.AnimationClip();
        bigJump.name = 'big_jump';
        bigJump.wrapMode = cc.WrapMode.Normal;
        bigJump.duration = 0.1;

        const die = new cc.AnimationClip();
        die.name = 'die';
        die.wrapMode = cc.WrapMode.Normal;
        die.duration = 0.5;

        if (this.anim) {
            this.anim.addClip(smallIdle);
            this.anim.addClip(smallRun);
            this.anim.addClip(smallJump);
            this.anim.addClip(bigIdle);
            this.anim.addClip(bigRun);
            this.anim.addClip(bigJump);
            this.anim.addClip(die);
        }
    }
    
    // 修正方法語法和邏輯
    public setState(state: PlayerState) {
        const prevState = this.currentState;
        this.currentState = state;

        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) return;

        switch (state) {
            case PlayerState.SMALL:
                if (prevState === PlayerState.BIG || prevState === PlayerState.FIRE) {
                    cc.audioEngine.playEffect(this.powerDownSound, false);
                }
                collider.size = cc.size(32, 32);
                collider.offset = cc.v2(0, 0);
                this.node.height = 32;
                break;

            case PlayerState.BIG:
            case PlayerState.FIRE:
                if (prevState === PlayerState.SMALL) {
                    cc.audioEngine.playEffect(this.powerUpSound, false);
                }
                collider.size = cc.size(32, 64);
                collider.offset = cc.v2(0, 16);
                this.node.height = 64;
                break;

            case PlayerState.INVINCIBLE:
                cc.audioEngine.playEffect(this.powerUpSound, false);
                this.isInvincible = true;
                this.invincibleTime = 10; // 10秒無敵時間
                break;
        }

        this.updateAnimation();
    }
    
    // 地面檢查
    private checkGround() {
        if (!this.groundCheck) return;
        
        // 使用射線檢測地面
        const start = this.groundCheck.convertToWorldSpaceAR(cc.Vec2.ZERO);
        const end = start.add(cc.v2(0, -5));
        
        const result = cc.director.getPhysicsManager().rayCast(start, end, cc.RayCastType.Closest);
        
        // 檢測是否有碰撞
        this.isGrounded = result.length > 0;
        
        // 著地時重置跳躍狀態
        if (this.isGrounded) {
            this.isJumping = false;
        }
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
        
        // 應用速度
        if (this.rigidBody) {
            this.rigidBody.linearVelocity = this.velocity;
        } else {
            this.node.x += this.velocity.x * dt;
            this.node.y += this.velocity.y * dt;
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
    onBeginContact(contact, selfCollider, otherCollider) {
        // 防止死亡後再處理碰撞
        if (this.isDead) return;
        
        const otherNode = otherCollider.node;
        
        // 碰到敵人
        if (otherNode.group === 'enemy') {
            // 檢查是否踩在敵人頭上
            const otherBottom = otherNode.y - otherNode.height / 2;
            const selfTop = selfCollider.node.y - selfCollider.offset.y + selfCollider.size.height / 2;
            const selfBottom = selfCollider.node.y - selfCollider.offset.y - selfCollider.size.height / 2;
            
            if (selfBottom > otherBottom + otherNode.height * 0.5) {
                // 踩到敵人頭部
                const enemy = otherNode.getComponent('Enemy');
                if (enemy) {
                    enemy.die();
                    this.velocity.y = this.jumpForce * 0.7; // 反彈
                }
            } else {
                // 碰到敵人其他部分
                this.hurt();
            }
        }
        
        // 碰到問號方塊
        else if (otherNode.group === 'questionBlock') {
            const selfTop = selfCollider.node.y - selfCollider.offset.y + selfCollider.size.height / 2;
            const otherBottom = otherNode.y - otherNode.height / 2;
            
            if (selfTop <= otherBottom + 5) {
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
        
        // 移除物理組件
        if (this.rigidBody) {
            this.rigidBody.active = false;
        }
        
        // 播放死亡音效
        if (this.dieSound) {
            cc.audioEngine.playEffect(this.dieSound, false);
        }
        
        // 播放死亡動畫
        this.anim.play('die');
        
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
    
    private playJumpSound() {
        if (this.jumpSound) {
            cc.audioEngine.playEffect(this.jumpSound, false);
        }
    }

    private playDieSound() {
        if (this.dieSound) {
            cc.audioEngine.playEffect(this.dieSound, false);
        }
    }

    private bounce() {
        this.rigidBody.linearVelocity = cc.v2(this.rigidBody.linearVelocity.x, this.jumpForce);
        this.playJumpSound();
    }

    private takeDamage() {
        if (this.isInvincible) return;

        this.isInvincible = true;
        this.playDieSound();

        // 減少生命值
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (gameManager) {
            gameManager.loseLife();
        }

        // 設置短暫無敵時間
        this.scheduleOnce(() => {
            this.isInvincible = false;
        }, 2);
    }

    onDestroy() {
        // 取消事件監聽
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }
}
