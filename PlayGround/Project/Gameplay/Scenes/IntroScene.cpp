#include "framework.h"
#include "IntroScene.h"

_bool IntroScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	elapsed_time_ = 0.0;

	scene_image_ = _GraphicSourceMgr.GetTexture(Path::Texture + std::wstring(L"Title-Screen-2560x1600.png"));
	if (nullptr == scene_image_)
	{
		_NULL_DETECTION_MSGBOX;
		return false;
	}

	scene_image_rect_ = RenderRectF(0.f, 0.f, s_float(scene_image_->Width()), s_float(scene_image_->Height()));

	MAKE_INITIALIZED;
	return true;
}

_int IntroScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);
	elapsed_time_ += _delta_time;

	if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
		_SceneMgr.ChangeScene(SceneType::Loading);

	constexpr _double kFadeInStart = 1.0;
	constexpr _double kFadeInDuration = 2.0;
	constexpr _double kHoldDuration = 2.0;
	constexpr _double kFadeOutDuration = 2.0;
	constexpr _double kPostInvisibleDelay = 2.0;

	const _double auto_change_time =
		kFadeInStart + kFadeInDuration + kHoldDuration + kFadeOutDuration + kPostInvisibleDelay;

	if (elapsed_time_ >= auto_change_time)
	{
		if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
			_SceneMgr.ChangeScene(SceneType::Loading);
	}

	return UPDATE_CONTINUE;
}

void IntroScene::Render(_double _delta_time)
{
	if (!scene_image_)
	{
		__super::Render(_delta_time);
		return;
	}

	// 1초 유지 후, 다음 1초 동안 1.0 -> 0.0으로 페이드 아웃
	constexpr _double kFadeInStart = 1.0;
	constexpr _double kFadeInDuration = 3.0;
	constexpr _double kHoldDuration = 3.0;
	constexpr _double kFadeOutDuration = 3.0;

 _float alpha = 0.0f;
	if (elapsed_time_ < kFadeInStart)
	{
		alpha = 0.0f;
	}
	else if (elapsed_time_ < kFadeInStart + kFadeInDuration)
	{
		const _double t = (elapsed_time_ - kFadeInStart) / kFadeInDuration;
        alpha = s_float(std::clamp(t, 0.0, 1.0));
	}
	else if (elapsed_time_ < kFadeInStart + kFadeInDuration + kHoldDuration)
	{
		alpha = 1.0f;
	}
	else if (elapsed_time_ < kFadeInStart + kFadeInDuration + kHoldDuration + kFadeOutDuration)
	{
		const _double t = (elapsed_time_ - (kFadeInStart + kFadeInDuration + kHoldDuration)) / kFadeOutDuration;
      alpha = s_float(std::clamp(1.0 - t, 0.0, 1.0));
	}
	else
	{
		alpha = 0.0f;
	}

  const _RectF dest_rect(0.f, 0.f, s_float(WINCX), s_float(WINCY));
	const _RectF src_rect(
		scene_image_rect_.X,
		scene_image_rect_.Y,
		scene_image_rect_.X + scene_image_rect_.Width,
		scene_image_rect_.Y + scene_image_rect_.Height);

	const auto alpha_byte = s_ubyte(std::round(std::clamp(alpha, 0.f, 1.f) * 255.f));
	_DrawFunc::DrawTexture(scene_image_, dest_rect, src_rect, alpha_byte);
}
