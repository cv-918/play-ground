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
        _int a = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetAlpha(), (_float)p.setting_.endColor.GetAlpha(), ratio, p.setting_.colorEase)));
		_int r = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetR(), (_float)p.setting_.endColor.GetR(), ratio, p.setting_.colorEase)));
		_int g = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetG(), (_float)p.setting_.endColor.GetG(), ratio, p.setting_.colorEase)));
		_int b = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetB(), (_float)p.setting_.endColor.GetB(), ratio, p.setting_.colorEase)));

		p.currentColor = _Color(a, r, g, b);

		++it;
	}

	return UPDATE_CONTINUE;
}

void ParticleService::Render(_double _delta_time)
{
	for (_uint idx : active_indices_)
	{
		auto& p = particle_pool_[idx];

		// 텍스처가 없는 경우: 기본 도형 렌더링
		if (p.setting_.textureKey.empty())
		{
			_float r = p.currentScale * 5.0f; // 기본 반지름 기준
			_DrawFunc::FillCircle(_Point(p.position_.x, p.position_.y), r, p.currentColor);
		}
		// 텍스처가 있는 경우: 텍스처 파티클 렌더링
		else
		{
			auto tex = _GraphicSourceMgr.GetTexture(p.setting_.textureKey);
			if (tex)
			{
				_float w = tex->Width() * p.currentScale;
				_float h = tex->Height() * p.currentScale;
				const _RectF dest_rect(p.position_.x - w * 0.5f, p.position_.y - h * 0.5f, p.position_.x + w * 0.5f, p.position_.y + h * 0.5f);
				_DrawFunc::DrawTexture(tex, dest_rect, p.currentColor, p.currentColor.GetAlpha());
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
		p.currentScale = _setting.startScale;
		p.currentColor = _setting.startColor;

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
