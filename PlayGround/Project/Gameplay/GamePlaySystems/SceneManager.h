#pragma once

#define _SceneMgr SceneManager::Get()

class Scene;
class SceneManager final
	: public ISingleton<SceneManager>
	, public IInitializable
	, public IUpdatable
{
private:
	enum class TransitionPhase
	{
		None,
		FadingOut,
		FadingIn,
		HoldingBlack,
		SwitchingWhileBlack,
	};

public:
	~SceneManager();

public:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	// 씬 변경 요청. 필요 시 같은 씬 타입도 강제로 다시 로드할 수 있습니다.
	void ChangeScene(SceneType _type, _bool _force_reload = false);
	_bool ReleaseHeldBlackWithFadeIn();

private:
	void _BeginFadeOut();
	void _BeginFadeIn();
	void _UpdateTransition(_double _delta_time);
	void _RenderTransitionOverlay() const;

	// 씬을 생성하는 팩토리 메서드. 필요에 따라 씬 타입에 따른 씬 객체를 생성하는 로직을 구현할 수 있습니다.
	void _CreateNextScene();

	// 씬을 정리하는 메서드. 필요에 따라 씬이 변경될 때마다 이전 씬을 정리하는 로직을 구현할 수 있습니다.
	void _CleanupCurrentScene(_bool _clear_particle_service = true);

	// 디버그용 씬 이름 반환 메서드. 필요에 따라 씬 타입에 따른 씬 이름을 반환하는 로직을 구현할 수 있습니다.
	std::wstring _GetSceneName(SceneType _type) const;

private:
	// 현재 활성화된 씬과 그 타입을 저장하는 멤버 변수. 씬 변경 시 이 변수들을 업데이트합니다.
	Scene* curr_scene_ = nullptr;
	SceneType curr_scene_type_ = SceneType::Count;
	SceneType next_scene_type_ = SceneType::Count;
	TransitionPhase transition_phase_ = TransitionPhase::None;
	_double transition_elapsed_ = 0.0;
	_float transition_alpha_ = 0.f;
	_double fade_out_duration_ = 0.3;
	_double fade_in_duration_ = 0.3;

	// 씬 변경 이력을 저장하는 벡터. 필요에 따라 씬 변경 로그를 기록하거나, 이전 씬으로 돌아가는 기능 등에 활용할 수 있습니다.
	std::vector<SceneType> scene_history_;
};

