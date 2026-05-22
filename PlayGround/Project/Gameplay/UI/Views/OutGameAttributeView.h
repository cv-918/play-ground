#pragma once
#include "../Widgets/WidgetBase.h"

class AttributeNodeTree;
class Image;

class OutGameAttributeView final : public WidgetBase
{
public:
	explicit OutGameAttributeView(
		const std::function<void()>& _skills_btn_callback,
		const std::function<void()>& _return_btn_callback
	);
	void ResetTreeViewState();

private:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnViewportChanged() override;

	void UpdateLayout();
	void _UpdateTreeInputRegion();

	Image* background_image_ = nullptr;
	class Button* skills_btn_ = nullptr;
	class Button* return_btn_ = nullptr;
	AttributeNodeTree* attribute_tree_ = nullptr;
};

