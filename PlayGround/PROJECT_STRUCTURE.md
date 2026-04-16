# Project Structure (Updated: 2026-04-16 17:27)

```text
Root
+--- Data
|   +--- Resources
|   |   +--- Fonts
|   |   +--- Textures
|   |   |   +--- Characters
|   |   |   |   +--- Dusty
|   |   |   |   |   +--- Dust_Idle
|   |   |   |   |   +--- Dust_Move
|   |   |   |   |   +--- Dust_Run
|   |   |   +--- Particles
|   |   |   +--- SceneImages
|   |   |   |   +--- Title
|   |   |   +--- Skills
|   |   |   |   +--- Icons
|   |   |   +--- UI
|   |   |   |   +--- Buttons
|   |   |   |   |   +--- APPLY
|   |   |   |   |   +--- BACK
|   |   |   |   |   +--- CANCEL
|   |   |   |   |   +--- EXIT
|   |   |   |   |   +--- NO
|   |   |   |   |   +--- RESET
|   |   |   |   |   +--- RESTART
|   |   |   |   |   +--- RESUME
|   |   |   |   |   +--- RETURN
|   |   |   |   |   +--- SETTINGS
|   |   |   |   |   +--- YES
|   |   |   |   +--- PopUps
|   |   |   +--- World
+--- html
|   +--- search
+--- Project
|   +--- App
|   |   |   EntryPoint.cpp
|   |   |   EntryPoint.h
|   |   |   PlayGround.cpp
|   |   |   PlayGround.h
|   +--- Core
|   |   +--- Base
|   |   |   |   Bases.h
|   |   |   |   Defines.h
|   |   |   |   DrawFunctions.cpp
|   |   |   |   DrawFunctions.h
|   |   |   |   Extern.h
|   |   |   |   UtilityFunctions.h
|   |   +--- Interface
|   |   |   |   Interfaces.h
|   |   +--- Math
|   |   |   |   Geometry2D.cpp
|   |   |   |   Geometry2D.h
|   |   |   |   MathFunctions.h
|   |   |   |   Random.cpp
|   |   |   |   Random.h
|   |   |   |   Vector2.cpp
|   |   |   |   Vector2.h
|   |   |   |   Vector3.h
|   +--- EngineSystems
|   |   +--- Input
|   |   |   |   InputManager.cpp
|   |   |   |   InputManager.h
|   |   +--- Json
|   |   |   |   JsonDataManager.cpp
|   |   |   |   JsonDataManager.h
|   |   +--- Physics
|   |   |   |   CollisionManager.cpp
|   |   |   |   CollisionManager.h
|   |   +--- Render
|   |   |   |   CameraManager.cpp
|   |   |   |   CameraManager.h
|   |   |   |   GraphicResourceManager.cpp
|   |   |   |   GraphicResourceManager.h
|   |   |   |   ParticleData.h
|   |   |   |   ParticleService.cpp
|   |   |   |   ParticleService.h
|   |   |   |   RenderChain.cpp
|   |   |   |   RenderChain.h
|   |   |   |   ScreenSystem.cpp
|   |   |   |   ScreenSystem.h
|   |   |   |   VideoSettings.h
|   |   +--- Timer
|   |   |   |   Timer.cpp
|   |   |   |   Timer.h
|   +--- Framework
|   |   |   framework.h
|   |   |   pch.cpp
|   |   |   PlayGround.rc
|   |   |   Resource.h
|   |   |   targetver.h
|   +--- Gameplay
|   |   +--- Actors
|   |   |   +--- Projectile
|   |   |   |   |   Bullet.cpp
|   |   |   |   |   Bullet.h
|   |   |   +--- Props
|   |   |   |   |   Dust.cpp
|   |   |   |   |   Dust.h
|   |   |   |   |   Props.cpp
|   |   |   |   |   Props.h
|   |   |   +--- Stage
|   |   |   |   |   ContactAttackAbility.cpp
|   |   |   |   |   ContactAttackAbility.h
|   |   |   |   |   DashAbility.cpp
|   |   |   |   |   DashAbility.h
|   |   |   |   |   Enemy.cpp
|   |   |   |   |   Enemy.h
|   |   |   |   |   EnemyAbilitySet.cpp
|   |   |   |   |   EnemyAbilitySet.h
|   |   |   |   |   EnemyTypes.h
|   |   |   |   |   ExpDust.cpp
|   |   |   |   |   ExpDust.h
|   |   |   |   |   IEnemyAbility.h
|   |   |   |   |   ProjectileAttackAbility.cpp
|   |   |   |   |   ProjectileAttackAbility.h
|   |   |   |   |   StagePlayer.cpp
|   |   |   |   |   StagePlayer.h
|   |   |   |   |   UnitBase.cpp
|   |   |   |   |   UnitBase.h
|   |   |   +--- Town
|   |   |   |   |   TownNpc.cpp
|   |   |   |   |   TownNpc.h
|   |   |   |   |   TownPlayer.cpp
|   |   |   |   |   TownPlayer.h
|   |   |   |   ActorTypes.h
|   |   |   |   ActorUtil.h
|   |   +--- Animation
|   |   |   |   SpriteAnimationBuilder.cpp
|   |   |   |   SpriteAnimationBuilder.h
|   |   |   |   SpriteAnimationSetData.h
|   |   |   |   SpriteAnimationTypes.h
|   |   +--- Common
|   |   |   |   CommonGamePlayDefine.h
|   |   |   |   CommonGamePlayFunctions.h
|   |   |   |   CommonGamePlayType.h
|   |   |   |   HitContext.h
|   |   +--- Components
|   |   |   |   Collider.cpp
|   |   |   |   Collider.h
|   |   |   |   Combat.cpp
|   |   |   |   Combat.h
|   |   |   |   ComponentBase.cpp
|   |   |   |   ComponentBase.h
|   |   |   |   EllipseCollider.cpp
|   |   |   |   EllipseCollider.h
|   |   |   |   Movement.cpp
|   |   |   |   Movement.h
|   |   |   |   NonPlayableMovement.cpp
|   |   |   |   NonPlayableMovement.h
|   |   |   |   PlayerMovement.cpp
|   |   |   |   PlayerMovement.h
|   |   |   |   RectCollider.cpp
|   |   |   |   RectCollider.h
|   |   |   |   SphereCollider.cpp
|   |   |   |   SphereCollider.h
|   |   |   |   SpriteAnimatorComponent.cpp
|   |   |   |   SpriteAnimatorComponent.h
|   |   |   |   SpriteRendererComponent.cpp
|   |   |   |   SpriteRendererComponent.h
|   |   |   |   Status.cpp
|   |   |   |   Status.h
|   |   |   |   TownInteraction.cpp
|   |   |   |   TownInteraction.h
|   |   |   |   Transform.cpp
|   |   |   |   Transform.h
|   |   +--- GamePlaySystems
|   |   |   +--- Dialogue
|   |   |   |   +--- Sample
|   |   |   |   |   |   DialogueSampleFactory.cpp
|   |   |   |   |   |   DialogueSampleFactory.h
|   |   |   |   |   DialogueJsonConverter.cpp
|   |   |   |   |   DialogueJsonConverter.h
|   |   |   |   |   DialogueRunner.cpp
|   |   |   |   |   DialogueRunner.h
|   |   |   |   |   DialogueSystem.cpp
|   |   |   |   |   DialogueSystem.h
|   |   |   |   |   DialogueTextLayouter.cpp
|   |   |   |   |   DialogueTextLayouter.h
|   |   |   |   |   DialogueTypes.h
|   |   |   |   |   DialogueWindowView.cpp
|   |   |   |   |   DialogueWindowView.h
|   |   |   |   |   IDialogueEventListener.h
|   |   |   +--- Json
|   |   |   |   |   AttributeNodeDataManager.cpp
|   |   |   |   |   AttributeNodeDataManager.h
|   |   |   |   |   DialogueJsonDataManager.cpp
|   |   |   |   |   DialogueJsonDataManager.h
|   |   |   |   |   EnemyDataManager.cpp
|   |   |   |   |   EnemyDataManager.h
|   |   |   |   |   ParticleDataManager.cpp
|   |   |   |   |   ParticleDataManager.h
|   |   |   |   |   PlayableCharacterDataManager.cpp
|   |   |   |   |   PlayableCharacterDataManager.h
|   |   |   |   |   SkillJsonDataManager.cpp
|   |   |   |   |   SkillJsonDataManager.h
|   |   |   |   |   StageJsonDataManager.cpp
|   |   |   |   |   StageJsonDataManager.h
|   |   |   |   |   UserDataManager.cpp
|   |   |   |   |   UserDataManager.h
|   |   |   +--- Skills
|   |   |   |   |   Dust_AtmosphericCorrosion.cpp
|   |   |   |   |   Dust_AtmosphericCorrosion.h
|   |   |   |   |   Dust_DarkSight.cpp
|   |   |   |   |   Dust_DarkSight.h
|   |   |   |   |   Dust_DustGust.cpp
|   |   |   |   |   Dust_DustGust.h
|   |   |   |   |   Dust_LintSatellite.cpp
|   |   |   |   |   Dust_LintSatellite.h
|   |   |   |   |   SkillBase.cpp
|   |   |   |   |   SkillBase.h
|   |   |   |   GameState.cpp
|   |   |   |   GameState.h
|   |   |   |   RunState.cpp
|   |   |   |   RunState.h
|   |   |   |   SceneManager.cpp
|   |   |   |   SceneManager.h
|   |   |   |   SkillManager.cpp
|   |   |   |   SkillManager.h
|   |   |   |   StageManager.cpp
|   |   |   |   StageManager.h
|   |   |   |   UIManager.cpp
|   |   |   |   UIManager.h
|   |   |   |   UserProfile.cpp
|   |   |   |   UserProfile.h
|   |   |   |   VideoSettingsManager.cpp
|   |   |   |   VideoSettingsManager.h
|   |   +--- Scenes
|   |   |   |   InGameScene.cpp
|   |   |   |   InGameScene.h
|   |   |   |   IntroScene.cpp
|   |   |   |   IntroScene.h
|   |   |   |   LoadingScene.cpp
|   |   |   |   LoadingScene.h
|   |   |   |   OutGameScene.cpp
|   |   |   |   OutGameScene.h
|   |   |   |   Scene.cpp
|   |   |   |   Scene.h
|   |   +--- UI
|   |   |   +--- Elements
|   |   |   |   |   Button.cpp
|   |   |   |   |   Button.h
|   |   |   |   |   Grid.cpp
|   |   |   |   |   Grid.h
|   |   |   |   |   Image.cpp
|   |   |   |   |   Image.h
|   |   |   |   |   ProgressBar.cpp
|   |   |   |   |   ProgressBar.h
|   |   |   |   |   Text.cpp
|   |   |   |   |   Text.h
|   |   |   +--- Views
|   |   |   |   |   InGamePauseView.cpp
|   |   |   |   |   InGamePauseView.h
|   |   |   |   |   InGamePlayView.cpp
|   |   |   |   |   InGamePlayView.h
|   |   |   |   |   InGameResultView.cpp
|   |   |   |   |   InGameResultView.h
|   |   |   |   |   InGameViewRenderUtils.h
|   |   |   |   |   OutGameAttributeView.cpp
|   |   |   |   |   OutGameAttributeView.h
|   |   |   |   |   OutGameExitView.h
|   |   |   |   |   OutGameMainView.cpp
|   |   |   |   |   OutGameMainView.h
|   |   |   |   |   OutGameOptionView.cpp
|   |   |   |   |   OutGameOptionView.h
|   |   |   +--- Widgets
|   |   |   |   |   AttributeNode.cpp
|   |   |   |   |   AttributeNode.h
|   |   |   |   |   AttributeNodeToolTip.cpp
|   |   |   |   |   AttributeNodeToolTip.h
|   |   |   |   |   AttributeNodeTree.cpp
|   |   |   |   |   AttributeNodeTree.h
|   |   |   |   |   FloatingText.cpp
|   |   |   |   |   FloatingText.h
|   |   |   |   |   HpBar.cpp
|   |   |   |   |   HpBar.h
|   |   |   |   |   InGameSkillSlot.cpp
|   |   |   |   |   InGameSkillSlot.h
|   |   |   |   |   WidgetBase.cpp
|   |   |   |   |   WidgetBase.h
|   |   |   |   UIBase.cpp
|   |   |   |   UIBase.h
|   |   +--- World
|   |   |   |   Background.cpp
|   |   |   |   Background.h
|   |   |   |   NavMesh.cpp
|   |   |   |   NavMesh.h
+--- xml
+--- _DevLog
|   +--- Document
|   |   +--- FixLog
|   +--- Documents
|   |   +--- Copilot
|   |   +--- Design
|   |   |   +--- Input
|   |   |   +--- Option
|   |   |   |   +--- Video
|   |   +--- Memo
|   |   +--- Scope
|   +--- Idea
|   +--- Minutes
+--- _Intermediate
+--- 리소스
|   PlayGround.ico
|   PlayGround.sln
|   PlayGround.vcxproj
|   small.ico
```
