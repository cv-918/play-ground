#pragma once
#include "../UIBase.h"

class UIBase;
class WidgetBase abstract : public UIBase
{
protected:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;

	void Render(_double _delta_time) override;

	_bool Release() override;

public:
	// 포함하고 있는 UI 요소들의 위치와 크기를 설정하는 메서드. 필요에 따라 포함된 UI 요소들의 위치와 크기를 일괄적으로 조정할 때 활용할 수 있습니다.
	void SetPosition(const _Point& _position) override;
	void SetSize(const _Size& _size) override;
	void SetCenter(const _Point& _center) override;

	// 유틸 위치 이동 함수
	void MoveX(const _int _dx);
	void MoveY(const _int _dy);

	// 유틸 크기 조절 함수
	void ScaleX(const _int _dWidth);
	void ScaleY(const _int _dHeight);

	// 위젯이 파괴될 때 포함된 UI 요소들도 함께 파괴되도록 구현. 필요에 따라 위젯이 파괴될 때 포함된 UI 요소들의 생명 주기를 관리할 때 활용할 수 있습니다.
	void OnDestroy() override;

public:
	// 위젯은 여러 UI 요소를 포함할 수 있으므로, UI 요소를 추가하는 메서드를 제공
	void AddElement(UIBase* _element);
	void RemoveElement(UIBase* _element);

protected:
	std::vector<UIBase*> elements_;
};

