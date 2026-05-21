#pragma once

#include "DialogueTypes.h"

#include <string>
#include <string_view>

struct TextureResource;

/**
 * @brief 다이얼로그 UI를 실제 화면에 렌더링하는 클래스
 *
 * - Runner의 상태를 읽어서 화면에 표현만 수행한다.
 * - 상태 변경 로직은 포함하지 않는다.
 * - UI 텍스처가 준비되어 있으면 텍스처를 사용한다.
 * - 텍스처 로드에 실패하면 fallback 박스 렌더를 사용한다.
 */
class DialogueWindowView
{
public:
    /**
     * @brief 기본 생성자
     */
    DialogueWindowView() = default;

    /**
     * @brief 기본 소멸자
     */
    ~DialogueWindowView() = default;

public:
    /**
     * @brief 다이얼로그 UI를 렌더링한다.
     * @param _session_data 현재 세션 데이터
     * @param _runtime_state 현재 런타임 상태
     */
    void Render(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const;

private:
    /**
     * @brief 현재 라인을 반환한다.
     * @return 유효한 라인이 없으면 nullptr
     */
    const DialogueLine* GetCurrentLine(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const;

    /**
     * @brief visible_char_count 기준으로 현재 표시 문자열을 생성한다.
     */
    std::wstring BuildVisibleText(std::wstring_view _full_text, int _page_char_start, int _visible_char_count) const;

private:
    /**
     * @brief 다이얼로그 배경을 렌더링한다.
     */
    [[nodiscard]] _bool RenderBackground(const _RectF& _rect, const TextureResource* _texture) const;

    /**
     * @brief 이름 영역을 렌더링한다.
     */
    void RenderNameBox(const DialogueLine& _line, const _RectF& _rect, const TextureResource* _texture) const;

    /**
     * @brief 본문 영역을 렌더링한다.
     */
    void RenderBodyText(const DialogueLine& _line, const _RectF& _rect, int _page_char_start, int _visible_char_count, _bool _using_texture_background) const;

    /**
     * @brief 선택지 영역을 렌더링한다.
     */
    void RenderChoices(const DialogueLine& _line, const _RectF& _rect, int _selected_choice_index, _bool _using_texture_background) const;

    /**
     * @brief 진행 인디케이터를 렌더링한다.
     */
    void RenderContinueIndicator(const DialogueRuntimeState& _runtime_state, const _Point& _pos, _bool _using_texture_background) const;
};
