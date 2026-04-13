#include "framework.h"
#include "DialogueWindowView.h"

#include "Core/Base/DrawFunctions.h"
#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
    constexpr _float WINDOW_WIDTH_RATIO = 0.74f;
    constexpr _float WINDOW_HEIGHT_RATIO = 0.26f;
    constexpr _float WINDOW_BOTTOM_MARGIN_RATIO = 0.05f;

    constexpr _float WINDOW_PADDING = 16.f;
    constexpr _float NAME_BOX_HEIGHT = 28.f;
    constexpr _float BODY_TOP_MARGIN = 8.f;
    constexpr _float CHOICE_TOP_MARGIN = 8.f;
    constexpr _float CHOICE_LINE_HEIGHT = 24.f;

    constexpr _float WINDOW_FONT_SIZE = 18.f;
    constexpr _float NAME_FONT_SIZE = 16.f;
    constexpr _float INDICATOR_FONT_SIZE = 16.f;

    constexpr _int NORMAL_MAX_LINE_COUNT = 3;
    constexpr _int CHOICE_MAX_LINE_COUNT = 2;

    const _Color WINDOW_BACKGROUND_COLOR = Palette::Charcoal;
    const _Color NAME_BOX_BACKGROUND_COLOR = Palette::SlateGray;
    const _Color BODY_TEXT_COLOR = Palette::White;
    const _Color CHOICE_TEXT_COLOR = Palette::DustyGray;
    const _Color CHOICE_SELECTED_TEXT_COLOR = Palette::White;
    const _Color INDICATOR_COLOR = Palette::White;
}

void DialogueWindowView::Render(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const
{
    const DialogueLine* current_line = GetCurrentLine(_session_data, _runtime_state);
    if (current_line == nullptr)
        return;

    const auto resolution = _ScreenSystem.WindowResolution();
    const _float screen_w = s_float(resolution.width);
    const _float screen_h = s_float(resolution.height);

    const _float window_w = screen_w * WINDOW_WIDTH_RATIO;
    const _float window_h = screen_h * WINDOW_HEIGHT_RATIO;
    const _float window_x = (screen_w - window_w) * 0.5f;
    const _float window_y = screen_h - window_h - (screen_h * WINDOW_BOTTOM_MARGIN_RATIO);

    const _RectF window_rect(window_x, window_y, window_x + window_w, window_y + window_h);
    RenderBackground(window_rect);

    const _float inner_left = window_x + WINDOW_PADDING;
    const _float inner_top = window_y + WINDOW_PADDING;
    const _float inner_width = window_w - (WINDOW_PADDING * 2.f);

    const _RectF name_rect(inner_left, inner_top, inner_left + inner_width, inner_top + NAME_BOX_HEIGHT);
    RenderNameBox(*current_line, name_rect);

    const _bool has_choices = !current_line->choices.empty();
    const _int body_max_line_count = has_choices ? CHOICE_MAX_LINE_COUNT : NORMAL_MAX_LINE_COUNT;

    const _float body_y = inner_top + NAME_BOX_HEIGHT + BODY_TOP_MARGIN;
    const _float body_h = WINDOW_FONT_SIZE * s_float(body_max_line_count) + 8.f;
    const _RectF body_rect(inner_left, body_y, inner_left + inner_width, body_y + body_h);
    RenderBodyText(*current_line, body_rect, _runtime_state.page_char_start, _runtime_state.visible_char_count);

    if (has_choices && _runtime_state.line_state == DialogueLineState::WaitingForChoice)
    {
        const _float choice_y = body_rect.Bottom() + CHOICE_TOP_MARGIN;
        const _float choice_h = CHOICE_LINE_HEIGHT * s_float(current_line->choices.size());
        const _RectF choice_rect(inner_left, choice_y, inner_left + inner_width, choice_y + choice_h);
        RenderChoices(*current_line, choice_rect, _runtime_state.selected_choice_index);
    }

    const _Point indicator_pos(
        s_int(std::round(window_rect.Right() - WINDOW_PADDING - 12.f)),
        s_int(std::round(window_rect.Bottom() - WINDOW_PADDING - 18.f))
    );
    RenderContinueIndicator(_runtime_state, indicator_pos);
}

const DialogueLine* DialogueWindowView::GetCurrentLine(const DialogueSessionData& _session_data, const DialogueRuntimeState& _runtime_state) const
{
    const int current_line_index = _runtime_state.current_line_index;
    if (current_line_index < 0 || current_line_index >= static_cast<int>(_session_data.lines.size()))
        return nullptr;

    return &_session_data.lines[current_line_index];
}

std::wstring DialogueWindowView::BuildVisibleText(std::wstring_view _full_text, int _page_char_start, int _visible_char_count) const
{
    if (_visible_char_count <= 0)
        return {};

    if (_page_char_start < 0)
        return {};

    if (_page_char_start >= static_cast<int>(_full_text.size()))
        return {};

    return std::wstring(
        _full_text.substr(
            static_cast<size_t>(_page_char_start),
            static_cast<size_t>(_visible_char_count)));
}

void DialogueWindowView::RenderBackground(const _RectF& _rect) const
{
    // 현재는 배경 텍스처가 없으므로 fallback 박스를 사용한다.
    // 추후 텍스처 리소스가 준비되면 DrawTexture 경로를 추가한다.
    _DrawFunc::FillRectangle(_rect, WINDOW_BACKGROUND_COLOR);
}

void DialogueWindowView::RenderNameBox(const DialogueLine& _line, const _RectF& _rect) const
{
    if (_line.message_type != DialogueMessageType::Dialogue)
        return;

    // 초기 구현은 별도 이름 박스 배경을 사용한다.
    _DrawFunc::FillRectangle(_rect, NAME_BOX_BACKGROUND_COLOR);

    _DrawFunc::DrawString(
        _rect,
        _line.speaker_name,
        BODY_TEXT_COLOR,
        NAME_FONT_SIZE,
        _DrawFunc::FONT_STYLE_BOLD,
        _DrawFunc::STRING_ALIGN_NEAR,
        _DrawFunc::STRING_ALIGN_CENTER,
        true);
}

void DialogueWindowView::RenderBodyText(
    const DialogueLine& _line,
    const _RectF& _rect,
    int _page_char_start,
    int _visible_char_count) const
{
    const std::wstring visible_text = BuildVisibleText(_line.text, _page_char_start, _visible_char_count);

    _DrawFunc::DrawString(
        _rect,
        visible_text,
        BODY_TEXT_COLOR,
        WINDOW_FONT_SIZE,
        _DrawFunc::FONT_STYLE_REGULAR,
        _DrawFunc::STRING_ALIGN_NEAR,
        _DrawFunc::STRING_ALIGN_NEAR,
        false);
}

void DialogueWindowView::RenderChoices(const DialogueLine& _line, const _RectF& _rect, int _selected_choice_index) const
{
    for (int i = 0; i < static_cast<int>(_line.choices.size()); ++i)
    {
        const DialogueChoice& choice = _line.choices[i];
        const _Color& text_color = (i == _selected_choice_index) ? CHOICE_SELECTED_TEXT_COLOR : CHOICE_TEXT_COLOR;

        const _RectF choice_rect(
            _rect.Left(),
            _rect.Top() + (CHOICE_LINE_HEIGHT * s_float(i)),
            _rect.Left() + _rect.Width(),
            _rect.Top() + (CHOICE_LINE_HEIGHT * s_float(i)) + CHOICE_LINE_HEIGHT
        );

        _DrawFunc::DrawString(
            choice_rect,
            choice.text,
            text_color,
            WINDOW_FONT_SIZE,
            _DrawFunc::FONT_STYLE_REGULAR,
            _DrawFunc::STRING_ALIGN_NEAR,
            _DrawFunc::STRING_ALIGN_NEAR,
            true);
    }
}

void DialogueWindowView::RenderContinueIndicator(const DialogueRuntimeState& _runtime_state, const _Point& _pos) const
{
    switch (_runtime_state.line_state)
    {
    case DialogueLineState::WaitingForNext:
    case DialogueLineState::AutoAdvancing:
        _DrawFunc::DrawString(_pos, L"▼", INDICATOR_COLOR, INDICATOR_FONT_SIZE, false);
        break;

    default:
        break;
    }
}