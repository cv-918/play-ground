#include "framework.h"
#include "ParticleService.h"

_bool ParticleService::Initialize(_uint _pool_size)
{
	pool_size_ = _pool_size;
	particle_pool_.resize(pool_size_);

	free_indices_.resize(pool_size_);
	std::iota(free_indices_.begin(), free_indices_.end(), 0); // 0, 1, 2, ..., pool_size_-1로 초기화
	return true;
}

_int ParticleService::Update(_double _delta_time)
{
	const auto dt = s_float(_delta_time);
	for (auto it = active_indices_.begin(); it != active_indices_.end(); )
	{
		_uint idx = *it;
		auto& p = particle_pool_[idx];

		// 1. 수명 관리
		p.life_time_ -= dt;
		if (p.life_time_ <= 0.f) {
			p.is_active_ = false;
			free_indices_.push_back(idx); // 인덱스 반납
			it = active_indices_.erase(it); // 활성 리스트에서 제거
			continue;
		}

		// 2. 진행 비율 계산 (0.0: 탄생 ~ 1.0: 소멸)
		_float ratio = 1.0f - (p.life_time_ / p.max_life_time_);

		// 3. 물리 연산: 공기 저항(Damping) 적용
		// 속도가 매 프레임 일정 비율로 줄어들어 자연스럽게 멈춥니다.
		p.velocity_ *= (1.0f - p.setting_.airResistance * dt);
		p.position_ += p.velocity_ * dt;

		// 4. 시각적 변화: Easing 적용 (크기)
		p.currentScale = _MathFunc::LerpWithEase(
			p.setting_.startScale,
			p.setting_.endScale,
			ratio,
			p.setting_.sizeEase
		);

		// 5. 시각적 변화: 색상 및 알파 보간
		// (실제 구현 시에는 Gdiplus::Color의 ARGB를 각각 Lerp합니다)
		_byte a = (_byte)_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetAlpha(), (_float)p.setting_.endColor.GetAlpha(), ratio, p.setting_.colorEase);
		_byte r = (_byte)_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetR(), (_float)p.setting_.endColor.GetR(), ratio, p.setting_.colorEase);
		_byte g = (_byte)_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetG(), (_float)p.setting_.endColor.GetG(), ratio, p.setting_.colorEase);
		_byte b = (_byte)_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetB(), (_float)p.setting_.endColor.GetB(), ratio, p.setting_.colorEase);

		p.currentColor = Gdiplus::Color(a, r, g, b);

		++it;
	}

	return UPDATE_CONTINUE;
}

void ParticleService::Render(_double _delta_time)
{
	for (_uint idx : active_indices_)
	{
		auto& p = particle_pool_[idx];

		// 텍스처가 없는 경우: GDI+ 기본 도형으로 최적화 렌더링
		if (p.setting_.textureKey.empty())
		{
			Gdiplus::SolidBrush brush(p.currentColor);
			_float r = p.currentScale * 5.0f; // 기본 반지름 기준
			g_graphics->FillEllipse(&brush,
				p.position_.x - r, p.position_.y - r, r * 2, r * 2);
		}
		// 텍스처가 있는 경우: 텍스처 파티클 렌더링
		else
		{
			// GDI+의 ImageAttributes를 사용하여 실시간 색상/알파 변환 적용
			Gdiplus::ImageAttributes attr;
			_float a = p.currentColor.GetAlpha() / 255.0f;
			_float r = p.currentColor.GetR() / 255.0f;
			_float g = p.currentColor.GetG() / 255.0f;
			_float b = p.currentColor.GetB() / 255.0f;

			Gdiplus::ColorMatrix matrix = {
				r,    0.0f, 0.0f, 0.0f, 0.0f,
				0.0f, g,    0.0f, 0.0f, 0.0f,
				0.0f, 0.0f, b,    0.0f, 0.0f,
				0.0f, 0.0f, 0.0f, a,    0.0f,
				0.0f, 0.0f, 0.0f, 0.0f, 1.0f
			};
			attr.SetColorMatrix(&matrix);

			auto tex = _GraphicSourceMgr.GetTexture(p.setting_.textureKey);
			if (tex)
			{
				_float w = tex->GetWidth() * p.currentScale;
				_float h = tex->GetHeight() * p.currentScale;
				g_graphics->DrawImage(tex,
					Gdiplus::RectF(p.position_.x - w / 2, p.position_.y - h / 2, w, h),
					0, 0, (Gdiplus::REAL)tex->GetWidth(), (Gdiplus::REAL)tex->GetHeight(),
					Gdiplus::UnitPixel, &attr);
			}
		}
	}
}

void ParticleService::Emit(const ParticleSetting& _setting, const _Vector2& _pos, _uint _count)
{
	for (_uint i = 0; i < _count; ++i)
	{
		if (free_indices_.empty()) break; // 풀이 가득 차면 중단

		_uint idx = free_indices_.back();
		free_indices_.pop_back();
		active_indices_.push_back(idx);

		auto& p = particle_pool_[idx];
		p.setting_ = _setting; // 레시피 복사
		p.is_active_ = true;

		// 1. 초기 위치 결정 (Shape)
		p.position_ = _pos;
		if (_setting.shape == EmitterShape::Circle) {
			// 원형 범위 내 랜덤 위치 (간단한 구현)
			_float angle = _MathFunc::ToRadian(s_float(rand() % 360));
			_float dist = s_float(rand() % 100) / 100.f * _setting.shapeRadius;
			p.position_.x += cosf(angle) * dist;
			p.position_.y += sinf(angle) * dist;
		}

		// 2. 초기 속도 및 방향 결정
		_float speed = _MathFunc::Lerp(_setting.minSpeed, _setting.maxSpeed, s_float(rand() % 100) / 100.f);
		_float moveAngle = _MathFunc::ToRadian(s_float(rand() % (_int)_setting.arcAngle) - (_setting.arcAngle / 2.f));
		p.velocity_ = { cosf(moveAngle) * speed, sinf(moveAngle) * speed };

		// 3. 수명 설정
		p.max_life_time_ = _MathFunc::Lerp(_setting.minLife, _setting.maxLife, s_float(rand() % 100) / 100.f);
		p.life_time_ = p.max_life_time_;
	}
}
