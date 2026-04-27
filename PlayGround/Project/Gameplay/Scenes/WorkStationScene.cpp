#include "framework.h"
#include "WorkStationScene.h"

#include "EngineSystems/Render/ScreenSystem.h"

#include "GamePlaySystems/GameDataLoader.h"
#include "GamePlaySystems/Json/ParticleDataManager.h"
#include "GamePlaySystems/Json/ParticleEmitterDataManager.h"

namespace
{
	constexpr _uint kParticleEmitterSampleId = 2001;
	constexpr _uint kParticleSampleId = 1001;
	constexpr _uint kParticleBurstCount = 8;
}

_bool WorkStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_SetStatus(L"F5 to reload all JSON data. LClick to play the selected sample.");

	MAKE_INITIALIZED;
	return true;
}

_int WorkStationScene::Update(_double _delta_time)
{
	const auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	if (_InputMgr.Down(VK_ESCAPE))
	{
		_SceneMgr.ChangeScene(SceneType::Intro);
		return UPDATE_BREAK;
	}

	if (_InputMgr.Down(VK_F5))
	{
		if (GameDataLoader::ReloadAll())
		{
			_SetStatus(L"Reload complete. Updated JSON data is now active.", Palette::Green);
		}
		else
		{
			_SetStatus(L"Reload failed. Check the log or JSON syntax errors.", Palette::Red);
		}
	}

	if (_InputMgr.Down('1'))
		_SelectSample(SampleMode::ParticleEmitter2001);

	if (_InputMgr.Down('2'))
		_SelectSample(SampleMode::Particle1001);

	if (_InputMgr.Down(VK_LBUTTON))
		_PlaySelectedSampleAtMouse();

	return UPDATE_CONTINUE;
}

void WorkStationScene::Render(_double _delta_time)
{
	const Resolution resolution = _ScreenSystem.WindowResolution();
	if (resolution.width > 0 && resolution.height > 0)
	{
		_DrawFunc::FillRectangle(
			_Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } },
			_Color(255, 24, 28, 36));
	}

	__super::Render(_delta_time);

	_DrawFunc::SetGlobalOffset(_Point::Zero());

	const _Point mouse_pos = _InputMgr.MousePointDesign();
	const std::wstring selected_label = L"Sample: " + _GetSelectedSampleLabel();
	const std::wstring mouse_label = L"Mouse: (" + std::to_wstring(mouse_pos.x) + L", " + std::to_wstring(mouse_pos.y) + L")";

	_DrawFunc::DrawString(_Point(24, 24), L"WorkStation Scene (Debug Only)", Palette::White, 24.f, false);
	_DrawFunc::DrawString(_Point(24, 64), selected_label, Palette::White, 16.f, false);
	_DrawFunc::DrawString(_Point(24, 92), L"F5  Reload all JSON data", Palette::White, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 116), L"1   Select ParticleEmitter.json id=2001", Palette::White, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 140), L"2   Select Particle.json id=1001", Palette::White, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 164), L"LClick  Play selected sample at the mouse cursor", Palette::White, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 188), L"Esc  Back to IntroScene", Palette::White, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 228), mouse_label, Palette::LightBlue, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 260), status_text_, status_color_, 14.f, false);
}

void WorkStationScene::OnEnter()
{
	_SYSTEM_LOG_INFO(L"Entered WorkStationScene.");
}

void WorkStationScene::_SelectSample(const SampleMode _mode)
{
	selected_sample_ = _mode;
	_SetStatus(L"Selected " + _GetSelectedSampleLabel() + L".");
}

void WorkStationScene::_PlaySelectedSampleAtMouse()
{
	const _Point mouse_pos = _InputMgr.MousePointDesign();
	const _Vector2 world_pos(s_cast(_float, mouse_pos.x), s_cast(_float, mouse_pos.y));

	switch (selected_sample_)
	{
	case SampleMode::ParticleEmitter2001:
	{
		const auto* emitter_spec = _ParticleEmitterDataMgr.GetData(kParticleEmitterSampleId);
		if (emitter_spec == nullptr)
		{
			_SetStatus(L"ParticleEmitter.json sample id=2001 was not found.", Palette::Red);
			_SYSTEM_LOG_ERROR(L"Particle emitter sample not found. id=%u", kParticleEmitterSampleId);
			return;
		}

		_ParticleService.PlayEmitterAt(*emitter_spec, world_pos);
		_SetStatus(L"Played ParticleEmitter.json id=2001 at the mouse cursor.", Palette::Green);
		return;
	}

	case SampleMode::Particle1001:
	{
		const auto* particle_setting = _ParticleDataMgr.GetData(kParticleSampleId);
		if (particle_setting == nullptr)
		{
			_SetStatus(L"Particle.json sample id=1001 was not found.", Palette::Red);
			_SYSTEM_LOG_ERROR(L"Particle sample not found. id=%u", kParticleSampleId);
			return;
		}

		_ParticleService.Emit(*particle_setting, world_pos, kParticleBurstCount);
		_SetStatus(L"Played Particle.json id=1001 burst at the mouse cursor.", Palette::Green);
		return;
	}
	}
}

void WorkStationScene::_SetStatus(const std::wstring& _text, const _Color& _color)
{
	status_text_ = _text;
	status_color_ = _color;
}

std::wstring WorkStationScene::_GetSelectedSampleLabel() const
{
	switch (selected_sample_)
	{
	case SampleMode::ParticleEmitter2001:
		return L"ParticleEmitter.json / 2001";
	case SampleMode::Particle1001:
		return L"Particle.json / 1001";
	}

	return L"Unknown";
}
