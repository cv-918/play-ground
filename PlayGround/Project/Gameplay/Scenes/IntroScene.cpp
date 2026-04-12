#include "framework.h"
#include "IntroScene.h"

#include "EngineSystems/Render/ScreenSystem.h"

_bool IntroScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	elapsed_time_ = 0.0;

	std::wstring scene_image_path = Path::SceneImages + std::wstring(L"Title/");
	std::vector<std::wstring> paths = {
		scene_image_path + std::wstring(L"Title-Scene.png"), // Scene
		scene_image_path + std::wstring(L"Title.png"), // Title
		scene_image_path + std::wstring(L"Press-any-key.png"), // PressAnyKey
	};

	const auto id_count = s_uint(IntroSceneImageId::Count);
	for (_uint i = 0; i < id_count; ++i)
	{
		TextureResource* texture = _GraphicSourceMgr.GetTexture(paths[i]);
		if (nullptr == texture)
		{
			_NULL_DETECTION_MSGBOX;
			return false;
		}

		const auto screen_resolution = _ScreenSystem.WindowResolution();
		const auto one_percent_x = screen_resolution.width / 100.f;
		const auto one_percent_y = screen_resolution.height / 100.f;
		std::vector<_Vector2> start_offsets = {
			_Vector2(one_percent_x * 0.f, one_percent_y * 0.f), // Scene (0%, 0% 지점부터 시작)
			_Vector2(one_percent_x * 56.4f, one_percent_y * 15.3f), // Title
			_Vector2(one_percent_x * 64.2f, one_percent_y * 75.6f), // PressAnyKey
		};

		std::vector<_Vector2> end_offsets = {
			_Vector2(one_percent_x * 100.f, one_percent_y * 100.f), // Scene (0%, 0% 지점부터 시작)
			_Vector2(one_percent_x * 93.5f, one_percent_y * 61.5f), // Title
			_Vector2(one_percent_x * 89.2f, one_percent_y * 84.6f), // PressAnyKey
		};
		
		IntroSceneImageEntity st;
		st.texture = texture;
		st.offset = start_offsets[i];
		st.render_dest_rect = { start_offsets[i].x, start_offsets[i].y, end_offsets[i].x, end_offsets[i].y };
		images_.push_back(st);
	}

	MAKE_INITIALIZED;
	return true;
}

_int IntroScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);
	elapsed_time_ += _delta_time;

#ifdef _DEBUG
	if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
	{
		_SceneMgr.ChangeScene(SceneType::OutGame);
		return UPDATE_BREAK;
	}
#endif // _DEBUG

	constexpr _double kFadeInStart = 1.0;
	constexpr _double kFadeInDuration = 1.25;
	constexpr _double kTitleFadeInStart = kFadeInStart + kFadeInDuration;
	constexpr _double kTitleFadeInDuration = 1.25;
	constexpr _double kPressAnyKeyBlinkStart = kTitleFadeInStart + kTitleFadeInDuration;
	constexpr _double kPressAnyKeyBlinkDuration = 1.0;

	if (elapsed_time_ < kFadeInStart)
	{
		current_state_ = IntroSceneState::SceneFadeIn;
		const _float progress = static_cast<_float>(kFadeInDuration - (kFadeInStart - elapsed_time_) / kFadeInDuration);
		images_[s_uint(IntroSceneImageId::Scene)].opacity = progress;
	}
	else if (elapsed_time_ < kTitleFadeInStart)
	{
		current_state_ = IntroSceneState::TitleFadeIn;
		const _float progress = static_cast<_float>(kTitleFadeInDuration - (kTitleFadeInStart - elapsed_time_) / kTitleFadeInDuration);
		images_[s_uint(IntroSceneImageId::Title)].opacity = progress;
	}
	else if (elapsed_time_ < kPressAnyKeyBlinkStart)
	{
		current_state_ = IntroSceneState::PressAnyKeyBlink;
		const _float progress = static_cast<_float>(kPressAnyKeyBlinkDuration - (kPressAnyKeyBlinkStart - elapsed_time_) / kPressAnyKeyBlinkDuration);
		images_[s_uint(IntroSceneImageId::PressAnyKey)].opacity = progress;
	}

	if (current_state_ == IntroSceneState::PressAnyKeyBlink)
	{
		if (_InputMgr.Down(VK_SPACE) || _InputMgr.Down(VK_RETURN))
		{
			_SceneMgr.ChangeScene(SceneType::OutGame);
			return UPDATE_BREAK;
		}

		// kPressAnyKeyBlinkDuration 동안 fade in 또는 fade out 효과를 반복
		// is_press_any_key_fading_in_ 가 true이면 fade in, false이면 fade out
		const _double time_in_blink = std::fmod(elapsed_time_ - kPressAnyKeyBlinkStart, kPressAnyKeyBlinkDuration);
		if (time_in_blink < kPressAnyKeyBlinkDuration / 2.0)
		{
			// Fade in
			const _float progress = static_cast<_float>(time_in_blink / (kPressAnyKeyBlinkDuration / 2.0));
			images_[s_uint(IntroSceneImageId::PressAnyKey)].opacity = progress;
		}
		else
		{
			// Fade out
			const _float progress = static_cast<_float>(1.0 - ((time_in_blink - kPressAnyKeyBlinkDuration / 2.0) / (kPressAnyKeyBlinkDuration / 2.0)));
			images_[s_uint(IntroSceneImageId::PressAnyKey)].opacity = progress;
		}
	}

	return UPDATE_CONTINUE;
}

void IntroScene::Render(_double _delta_time)
{
	if(images_.empty())
	{
		__super::Render(_delta_time);
		return;
	}

	for (const auto& entity : images_)
	{
		const auto alpha_byte = s_ubyte(std::round(std::clamp(entity.opacity, 0.f, 1.f) * 255.f));
		_DrawFunc::DrawTexture(entity.texture, entity.render_dest_rect, alpha_byte);
	}
}
