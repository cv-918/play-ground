# Project Structure (Updated: 2026-03-30 17:00)

```text
Root
+--- Data
|   +--- Resources
|   |   +--- Textures
|   |   |   +--- Chatacters
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
|   |   |   |   ParticleService.cpp
|   |   |   |   ParticleService.h
|   |   |   |   RenderChain.cpp
|   |   |   |   RenderChain.h
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
|   |   |   |   Enemy.cpp
|   |   |   |   Enemy.h
|   |   |   |   ExpDust.cpp
|   |   |   |   ExpDust.h
|   |   |   |   Player.cpp
|   |   |   |   Player.h
|   |   |   |   UnitBase.cpp
|   |   |   |   UnitBase.h
|   |   +--- Common
|   |   |   |   CommonGamePlayDefine.h
|   |   |   |   CommonGamePlayFunctions.h
|   |   |   |   CommonGamePlayType.h
|   |   +--- Components
|   |   |   |   Collider.cpp
|   |   |   |   Collider.h
|   |   |   |   Combat.cpp
|   |   |   |   Combat.h
|   |   |   |   ComponentBase.cpp
|   |   |   |   ComponentBase.h
|   |   |   |   Movement.cpp
|   |   |   |   Movement.h
|   |   |   |   NonPlayableMovement.cpp
|   |   |   |   NonPlayableMovement.h
|   |   |   |   PlayableMovement.cpp
|   |   |   |   PlayableMovement.h
|   |   |   |   RectCollider.cpp
|   |   |   |   RectCollider.h
|   |   |   |   SphereCollider.cpp
|   |   |   |   SphereCollider.h
|   |   |   |   Status.cpp
|   |   |   |   Status.h
|   |   |   |   Transform.cpp
|   |   |   |   Transform.h
|   |   +--- GamePlaySystems
|   |   |   +--- Json
|   |   |   |   |   AttributeNodeDataManager.cpp
|   |   |   |   |   AttributeNodeDataManager.h
|   |   |   |   |   EnemyDataManager.cpp
|   |   |   |   |   EnemyDataManager.h
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
|   |   |   |   |   Dust_DrakSight.cpp
|   |   |   |   |   Dust_DrakSight.h
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
|   |   |   |   |   OutGameAttributeView.cpp
|   |   |   |   |   OutGameAttributeView.h
|   |   |   |   |   OutGameMainView.cpp
|   |   |   |   |   OutGameMainView.h
|   |   |   +--- Widgets
|   |   |   |   |   AttributeNode.cpp
|   |   |   |   |   AttributeNode.h
|   |   |   |   |   AttributeNodeToolTip.cpp
|   |   |   |   |   AttributeNodeToolTip.h
|   |   |   |   |   AttributeNodeTree.cpp
|   |   |   |   |   AttributeNodeTree.h
|   |   |   |   |   DamageFont.cpp
|   |   |   |   |   DamageFont.h
|   |   |   |   |   HpBar.cpp
|   |   |   |   |   HpBar.h
|   |   |   |   |   WidgetBase.cpp
|   |   |   |   |   WidgetBase.h
|   |   |   |   UIBase.cpp
|   |   |   |   UIBase.h
|   |   +--- World
|   |   |   |   Background.cpp
|   |   |   |   Background.h
|   |   |   |   NavMesh.cpp
|   |   |   |   NavMesh.h
+--- _DevLog
|   +--- Documents
|   +--- Idea
|   +--- Minutes
+--- _Intermediate
|   PlayGround.ico
|   PlayGround.sln
|   PlayGround.vcxproj
|   small.ico
```
