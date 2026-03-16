#pragma once
#include "../UIBase.h"

class UIBase;
class WidgetBase abstract : public UIBase
{
public:
	~WidgetBase() override;

public:
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	// 포함하고 있는 UI 요소들의 위치와 크기를 설정하는 메서드. 필요에 따라 포함된 UI 요소들의 위치와 크기를 일괄적으로 조정할 때 활용할 수 있습니다.
	void SetPosition(const _Point& _position) override;
	void SetSize(const _Size& _size) override;
	void SetCenter(const _Point& _center) override;

	void MoveX(const _int _dx) override;
	void MoveY(const _int _dy) override;

	void ScaleX(const _int _dWidth) override;
	void ScaleY(const _int _dHeight) override;

	// 위젯이 파괴될 때 포함된 UI 요소들도 함께 파괴되도록 구현. 필요에 따라 위젯이 파괴될 때 포함된 UI 요소들의 생명 주기를 관리할 때 활용할 수 있습니다.
	void OnDestroy() override;

private:
	// 위젯은 여러 UI 요소를 포함할 수 있으므로, UI 요소를 추가하는 메서드를 제공
	void _AddElement(UIBase* _element);

protected:
	// 위젯 클래스 내부에서만 UI 요소를 생성할 수 있도록 제한. 필요에 따라 위젯 클래스 내부에서 UI 요소를 생성할 때 활용할 수 있습니다.
	template<typename T, typename... Args>
	T* CreateElement(Args&&... _args)
	{
		T* element = new T(std::forward<Args>(_args)...);
		if (element->Initialize())
		{
			_AddElement(element);
			return element;
		}
		SAFE_DELETE(element);
		return nullptr;
	}

private:
	std::vector<UIBase*> elements_;

	// [ Fade 효과를 위한 타이머와 플래그 ]
private:
	_bool on_fade_out_ = false; // 페이드 아웃이 진행 중인지 여부를 나타내는 플래그. 필요에 따라 위젯이 사라지는 동안 추가적인 효과나 로직을 처리할 때 활용할 수 있습니다.
	_double fade_timer_ = 0.0; // 페이드 효과가 진행된 시간을 추적하는 타이머. 필요에 따라 위젯이 사라지는 동안 페이드 효과의 진행 정도를 계산할 때 활용할 수 있습니다.
	_double fade_duration_ = 1.0; // 페이드 효과가 완전히 진행되는 데 걸리는 시간(초). 필요에 따라 위젯이 사라지는 동안 페이드 효과의 속도를 조절할 때 활용할 수 있습니다.
	_bool destroy_on_fade_out_complete_ = false; // 페이드 아웃이 완료된 후 위젯을 자동으로 파괴할지 여부를 나타내는 플래그. 필요에 따라 위젯이 사라지는 동안 페이드 효과가 완료되면 위젯을 자동으로 제거할 때 활용할 수 있습니다.

protected:
	void _StartFadeOut(_bool _destroy) { on_fade_out_ = true; fade_timer_ = 0.0; destroy_on_fade_out_complete_ = _destroy; }
	void _UpdateFadeOut(_double _delta_time);
	_double _GetFadeProgress() const { return on_fade_out_ ? std::min(fade_timer_ / fade_duration_, 1.0) : 0.0; }

	_bool _IsFadingOut() const { return on_fade_out_; }
	_bool _IsFadeOutComplete() const { return on_fade_out_ && fade_timer_ >= fade_duration_; }

	_double _GetFadeDuration() const { return fade_duration_; }
	void _SetFadeDuration(_double _duration) { fade_duration_ = _duration; }
};

