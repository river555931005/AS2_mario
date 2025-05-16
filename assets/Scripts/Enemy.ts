/**
 * 敵人控制器
 * 負責敵人的行為、動畫和物理碰撞
 */

const {ccclass, property} = cc._decorator;

export enum EnemyType {
    GOOMBA,
    TURTLE,
    FLOWER
}

@ccclass
export default class Enemy extends cc.Component {
    
    // 敵人屬性
    @property({
        type: cc.Enum(EnemyType),
    })
    public type: EnemyType = EnemyType.GOOMBA;
    
    @property(cc.Float)
    public moveSpeed: number = 100;
    
    @property(cc.Float)
    public gravity: number = -1000;
    
    // 動畫相關
    @property(cc.Animation)
    private anim: cc.Animation = null;
    
    // 音效
    @property(cc.AudioClip)
    private dieSound: cc.AudioClip = null;
    
    // 私有屬性
    private rigidBody: cc.RigidBody = null;
    private isDead: boolean = false;
    private isTurnedOver: boolean = false;
    private direction: number = -1; // -1=左，1=右
    private velocity: cc.Vec2 = cc.v2(0, 0);
    private isGrounded: boolean = false;
    
    onLoad() {
        // 獲取組件
        this.rigidBody = this.getComponent(cc.RigidBody);
        
        // 設置碰撞邊界
        let collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            collider = this.addComponent(cc.PhysicsBoxCollider);
            
            switch (this.type) {
                case EnemyType.GOOMBA:
                    collider.size = cc.size(32, 32);
                    break;
                case EnemyType.TURTLE:
                    collider.size = cc.size(32, 48);
                    break;
                case EnemyType.FLOWER:
                    collider.size = cc.size(32, 48);
                    break;
            }
            
            collider.offset = cc.v2(0, 0);
            collider.sensor = false;
        }
        
        // 初始化動畫
        this.initAnimations();
        
        // 設置起始方向和速度
        this.velocity.x = this.moveSpeed * this.direction;
    }
    
    start() {
        // 播放默認動畫
        this.updateAnimation();
    }
    
    update(dt) {
        // 如果死亡且不是翻倒的烏龜，不更新
        if (this.isDead && !(this.type === EnemyType.TURTLE && this.isTurnedOver)) {
            return;
        }
        
        // 應用重力
        this.velocity.y += this.gravity * dt;
        
        // 檢查地面
        this.checkGround();
        
        // 應用運動
        if (this.rigidBody) {
            this.rigidBody.linearVelocity = this.velocity;
        } else {
            this.node.x += this.velocity.x * dt;
            this.node.y += this.velocity.y * dt;
        }
        
        // 邊界檢查
        this.checkBounds();
    }
    
    // 修正動畫初始化問題
    private initAnimations() {
        let walkClip: cc.AnimationClip | null = null;
        let dieClip: cc.AnimationClip | null = null;

        switch (this.type) {
            case EnemyType.GOOMBA:
                walkClip = new cc.AnimationClip();
                walkClip.name = 'goomba_walk';
                walkClip.wrapMode = cc.WrapMode.Loop;
                walkClip.duration = 0.5;
                walkClip.sample = 10;

                dieClip = new cc.AnimationClip();
                dieClip.name = 'goomba_die';
                dieClip.wrapMode = cc.WrapMode.Normal;
                dieClip.duration = 0.5;
                dieClip.sample = 10;
                break;

            case EnemyType.TURTLE:
                walkClip = new cc.AnimationClip();
                walkClip.name = 'turtle_walk';
                walkClip.wrapMode = cc.WrapMode.Loop;
                walkClip.duration = 0.5;
                walkClip.sample = 10;

                dieClip = new cc.AnimationClip();
                dieClip.name = 'turtle_die';
                dieClip.wrapMode = cc.WrapMode.Normal;
                dieClip.duration = 0.5;
                dieClip.sample = 10;
                break;

            case EnemyType.FLOWER:
                walkClip = new cc.AnimationClip();
                walkClip.name = 'flower_attack';
                walkClip.wrapMode = cc.WrapMode.Loop;
                walkClip.duration = 1;
                walkClip.sample = 10;

                dieClip = new cc.AnimationClip();
                dieClip.name = 'flower_die';
                dieClip.wrapMode = cc.WrapMode.Normal;
                dieClip.duration = 0.5;
                dieClip.sample = 10;
                break;
        }

        if (this.anim) {
            if (walkClip) this.anim.addClip(walkClip);
            if (dieClip) this.anim.addClip(dieClip);
        }
    }
    
    // 更新動畫
    private updateAnimation() {
        if (!this.anim) return;
        
        if (this.isDead) {
            switch (this.type) {
                case EnemyType.GOOMBA:
                    this.anim.play('goomba_die');
                    break;
                case EnemyType.TURTLE:
                    if (this.isTurnedOver) {
                        this.anim.play('turtle_die');
                    }
                    break;
                case EnemyType.FLOWER:
                    this.anim.play('flower_die');
                    break;
            }
        } else {
            switch (this.type) {
                case EnemyType.GOOMBA:
                    this.anim.play('goomba_walk');
                    break;
                case EnemyType.TURTLE:
                    this.anim.play('turtle_walk');
                    break;
                case EnemyType.FLOWER:
                    this.anim.play('flower_attack');
                    break;
            }
        }
        
        // 更新朝向
        if (this.type !== EnemyType.FLOWER) {
            if (this.velocity.x > 0) {
                this.node.scaleX = 1;
            } else if (this.velocity.x < 0) {
                this.node.scaleX = -1;
            }
        }
    }
    
    // 地面檢查
    private checkGround() {
        // 使用射線檢測地面
        const start = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO).add(cc.v2(0, -this.node.height / 2));
        const end = start.add(cc.v2(0, -5));
        
        const result = cc.director.getPhysicsManager().rayCast(start, end, cc.RayCastType.Closest);
        
        // 檢測是否有碰撞
        this.isGrounded = result.length > 0;
    }
    
    // 邊界檢查
    private checkBounds() {
        // 如果是食人花，不做邊界檢查
        if (this.type === EnemyType.FLOWER) {
            return;
        }
        
        const gameView = cc.find('Canvas');
        if (!gameView) return;
        
        // 檢查是否掉出螢幕底部
        if (this.node.y < -gameView.height / 2 - 100) {
            this.node.destroy();
        }
    }
    
    // 碰撞開始
    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider) {
        if (this.isDead) return;

        // 確認碰撞的對象是否為玩家
        if (otherCollider.node.group === 'player') {
            const player = otherCollider.node.getComponent('Player');
            if (player) {
                // 檢查玩家是否從上方擊中敵人
                const playerVelocity = player.getComponent(cc.RigidBody).linearVelocity;
                if (playerVelocity.y < 0) {
                    // 玩家擊殺敵人
                    this.die();
                    player.bounce(); // 玩家反彈效果
                } else {
                    // 玩家受傷
                    player.takeDamage();
                }
            }
        }
    }
    
    // 碰撞進行中
    onPreSolve(contact, selfCollider, otherCollider) {
        // 如果是食人花，不對碰撞做處理
        if (this.type === EnemyType.FLOWER) {
            return;
        }
        
        const otherNode = otherCollider.node;
        
        // 如果是烏龜殼碰到其他敵人
        if (this.type === EnemyType.TURTLE && this.isTurnedOver && 
            (otherNode.group === 'enemy' || otherNode.group === 'player')) {
            
            // 獲取碰撞法線
            const normal = contact.getWorldManifold().normal;
            
            // 處理烏龜殼與其他物體的碰撞
            if (otherNode.group === 'enemy') {
                const enemy = otherNode.getComponent('Enemy');
                if (enemy && !enemy.isDead) {
                    enemy.die();
                }
            } 
            // 處理烏龜殼與玩家的碰撞放在玩家腳本中
        }
    }
    
    // 死亡
    public die() {
        if (this.isDead) return;
        
        this.isDead = true;
        
        // 播放死亡音效
        if (this.dieSound) {
            cc.audioEngine.playEffect(this.dieSound, false);
        }
        
        // 根據敵人類型不同的死亡處理
        switch (this.type) {
            case EnemyType.GOOMBA:
                // 扁平化並消失
                this.getComponent(cc.PhysicsBoxCollider).enabled = false;
                this.updateAnimation();
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 0.5);
                break;
                
            case EnemyType.TURTLE:
                // 變成烏龜殼
                this.isTurnedOver = true;
                this.velocity.x = 0;
                this.updateAnimation();
                break;
                
            case EnemyType.FLOWER:
                // 食人花直接消失
                this.getComponent(cc.PhysicsBoxCollider).enabled = false;
                this.updateAnimation();
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 0.5);
                break;
        }
        
        // 增加玩家分數
        const gameManager = cc.find('GameManager').getComponent('GameManager');
        if (gameManager) {
            gameManager.addScore(100);
        }
    }
}
